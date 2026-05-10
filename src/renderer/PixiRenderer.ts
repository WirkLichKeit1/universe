import * as PIXI from "pixi.js"

export interface EntityData {
    id: number
    x: number
    y: number
    energy: number
    dna: {
        speed: number
        visionRadius: number
        reproductionThreshold: number
    } | null
}

export interface FoodData {
    id: number
    x: number
    y: number
}

export interface WorldState {
    entities: EntityData[]
    food: FoodData[]
    reproductionEvents: { x: number; y: number }[]
}

const WORLD_WIDTH = 25600
const WORLD_HEIGHT = 19200
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ENERGY_MAX = 250

export class PixiRenderer {
    private app: PIXI.Application
    private entitySprites: Map<number, PIXI.Container> = new Map()
    private entityEnergy: Map<number, number> = new Map()
    private foodSprites: Map<number, PIXI.Graphics> = new Map()
    private pulses: { g: PIXI.Graphics; x: number; y: number; age: number }[] = []
    private worldContainer: PIXI.Container
    private scale: number = 1
    private dragging: boolean = false
    private dragStart: { x: number; y: number } = { x: 0, y: 0 }
    private containerStart: { x: number; y: number } = { x: 0, y: 0 }
    private followingId: number | null = null
    private onFollowChange?: (id: number | null) => void

    constructor(canvas: HTMLCanvasElement) {
        this.app = new PIXI.Application({
            view: canvas,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x0a0a0f,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        })

        this.worldContainer = new PIXI.Container()
        this.app.stage.addChild(this.worldContainer)

        this.fitWorld()
        this.drawWorldBorder()
        this.setupControls(canvas)
        
        this.app.ticker.add((delta) => {
            this.updatePulses(delta)
        })
    }

    setOnFollowChange(cb: (id: number | null) => void): void {
        this.onFollowChange = cb
    }

    followCreature(id: number | null): void {
        this.followingId = id
        this.onFollowChange?.(id)
    }

    getCameraRect(): { x: number; y: number; w: number; h: number } {
        return {
            x: -this.worldContainer.x / this.scale,
            y: -this.worldContainer.y / this.scale,
            w: window.innerWidth / this.scale,
            h: window.innerHeight / this.scale,
        }
    }

    private centerOn(x: number, y: number): void {
        this.worldContainer.x = window.innerWidth / 2 - x * this.scale
        this.worldContainer.y = window.innerHeight / 2 - y * this.scale
    }

    private fitWorld(): void {
        const viewWidth = 4000
        const viewHeight = 3000

        this.scale = Math.min(
            window.innerWidth / viewWidth,
            window.innerHeight / viewHeight
        )

        const worldCenterX = WORLD_WIDTH / 2
        const worldCenterY = WORLD_HEIGHT / 2

        this.worldContainer.scale.set(this.scale)
        this.worldContainer.x = window.innerWidth / 2 - worldCenterX * this.scale
        this.worldContainer.y = window.innerHeight / 2 - worldCenterY * this.scale
    }

    private drawWorldBorder(): void {
        const border = new PIXI.Graphics()
        border.lineStyle(4, 0x222244, 1)
        border.drawRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
        this.worldContainer.addChild(border)
    }

    private setupControls(canvas: HTMLCanvasElement): void {
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault()
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
            this.applyZoom(zoomFactor, e.clientX, e.clientY)
        }, { passive: false })

        canvas.addEventListener("mousedown", (e) => {
            this.dragging = true
            this.dragStart = { x: e.clientX, y: e.clientY }
            this.containerStart = { x: this.worldContainer.x, y: this.worldContainer.y }
            canvas.style.cursor = "grabbing"
        })

        canvas.addEventListener("mousemove", (e) => {
            if (!this.dragging) return

            const dx = e.clientX - this.dragStart.x
            const dy = e.clientY - this.dragStart.y
            if (Math.sqrt(dx * dx + dy * dy) < 4) return // threshold pra não se mover em cliques
            this.worldContainer.x = this.containerStart.x + dx
            this.worldContainer.y = this.containerStart.y + dy
        })

        canvas.addEventListener("mouseup", () => {
            this.dragging = false
            canvas.style.cursor = "default"
        })

        canvas.addEventListener("mouseleave", () => {
            this.dragging = false
            canvas.style.cursor = "default"
        })

        // touch
        let lastTouchDist = 0
        let lastMidpoint = { x: 0, y: 0 }

        canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                this.dragging = true
                this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
                this.containerStart = { x: this.worldContainer.x, y: this.worldContainer.y }
            } else if (e.touches.length === 2) {
                this.dragging = false
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                lastTouchDist = Math.sqrt(dx * dx + dy * dy)
                lastMidpoint = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                }
            }
        })

        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault()
            if (e.touches.length === 1 && this.dragging) {
                this.worldContainer.x = this.containerStart.x + (e.touches[0].clientX - this.dragStart.x)
                this.worldContainer.y = this.containerStart.y + (e.touches[0].clientY - this.dragStart.y)
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                const dist = Math.sqrt(dx * dx + dy * dy)
                const midpoint = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                }
                const zoomFactor = dist / lastTouchDist
                this.applyZoom(zoomFactor, midpoint.x, midpoint.y)
                lastTouchDist = dist
                lastMidpoint = midpoint
            }
        }, { passive: false })

        canvas.addEventListener("touchend", () => {
            this.dragging = false
        })

        canvas.addEventListener("click", (e) => {
            if (this.dragging) return

            // converte coordenada do clique pra coordenada do mundo
            const worldX = (e.clientX - this.worldContainer.x) / this.scale
            const worldY = (e.clientY - this.worldContainer.y) / this.scale

            // procura criatura mais próxima do clique (raio de 30 unidades do mundo)
            let closest: number | null = null
            let closestDist = 600

            this.entitySprites.forEach((sprite, id) => {
                const dx = sprite.x - worldX
                const dy = sprite.y - worldY
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < closestDist) {
                    closestDist = dist
                    closest = id
                }
            })

            this.followCreature(closest)
        })
    }

    private applyZoom(factor: number, pivotX: number, pivotY: number): void {
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.scale * factor))
        const worldX = (pivotX - this.worldContainer.x) / this.scale
        const worldY = (pivotY - this.worldContainer.y) / this.scale
        this.scale = newScale
        this.worldContainer.scale.set(this.scale)
        this.worldContainer.x = pivotX - worldX * this.scale
        this.worldContainer.y = pivotY - worldY * this.scale
    }

    private getDNAColor(dna: EntityData["dna"], energy: number): number {
        const r = dna ? Math.min(255, Math.floor((dna.speed / 300) * 255)) : 29
        const g = dna ? Math.min(255, Math.floor((dna.visionRadius / 3500) * 255)) : 158
        const b = dna ? Math.min(255, Math.floor((dna.reproductionThreshold / 210) * 255)) : 117

        const energyFactor = Math.max(0.3, energy / 250)
        const fr = Math.max(0, Math.min(255, Math.floor(r * energyFactor)))
        const fg = Math.max(0, Math.min(255, Math.floor(g * energyFactor)))
        const fb = Math.max(0, Math.min(255, Math.floor(b * energyFactor)))
        
        return (fr << 16) | (fg << 8) | fb
    }

    private buildEntitySprite(energy: number, dna: EntityData["dna"]): PIXI.Container {
        const container = new PIXI.Container()
        const color = this.getDNAColor(dna, energy)
        const dark = 0x0a0a0f
        const g = new PIXI.Graphics()

        g.lineStyle(3, color, 1)
        g.moveTo(-5, 20)
        g.lineTo(-7, 36)
        g.moveTo(5, 20)
        g.lineTo(7, 36)

        g.lineStyle(0)
        g.beginFill(color)
        g.drawRoundedRect(-10, 0, 20, 22, 5)
        g.endFill()

        g.lineStyle(3, color, 1)
        g.moveTo(-10, 4)
        g.lineTo(-18, 18)
        g.moveTo(10, 4)
        g.lineTo(18, 18)

        g.lineStyle(0)
        g.beginFill(color)
        g.drawCircle(0, -12, 10)
        g.endFill()

        g.beginFill(dark)
        g.drawCircle(-4, -13, 2)
        g.drawCircle(4, -13, 2)
        g.endFill()

        container.addChild(g)

        const barBg = new PIXI.Graphics()
        barBg.beginFill(0x222222)
        barBg.drawRoundedRect(-12, -28, 24, 4, 2)
        barBg.endFill()

        const barFill = new PIXI.Graphics()
        const fillWidth = Math.max(0, (energy / ENERGY_MAX) * 24)
        barFill.beginFill(color)
        barFill.drawRoundedRect(-12, -28, fillWidth, 4, 2)
        barFill.endFill()

        container.addChild(barBg)
        container.addChild(barFill)

        return container
    }

    update(state: WorldState): void {
        if (this.followingId !== null) {
            const entity = state.entities.find(e => e.id === this.followingId)
            if (entity) {
                this.centerOn(entity.x, entity.y)
            } else {
                this.followingId = null
                this.onFollowChange?.(null)
            }
        }
        
        const activeEntityIds = new Set(state.entities.map(e => e.id))
        const activeFoodIds = new Set(state.food.map(f => f.id))

        this.entitySprites.forEach((sprite, id) => {
            if (!activeEntityIds.has(id)) {
                this.worldContainer.removeChild(sprite)
                this.entitySprites.delete(id)
                this.entityEnergy.delete(id)
            }
        })

        this.foodSprites.forEach((sprite, id) => {
            if (!activeFoodIds.has(id)) {
                this.worldContainer.removeChild(sprite)
                this.foodSprites.delete(id)
            }
        })

        state.entities.forEach(e => {
            const prevEnergy = this.entityEnergy.get(e.id)
            const energyChanged = prevEnergy === undefined || Math.abs(prevEnergy - e.energy) > 2

            if (this.entitySprites.has(e.id)) {
                const container = this.entitySprites.get(e.id)!
                container.x = e.x
                container.y = e.y

                // reconstrói o sprite se a energia mudou o suficiente
                if (energyChanged) {
                    this.worldContainer.removeChild(container)
                    const newContainer = this.buildEntitySprite(e.energy, e.dna)
                    newContainer.x = e.x
                    newContainer.y = e.y
                    this.worldContainer.addChild(newContainer)
                    this.entitySprites.set(e.id, newContainer)
                    this.entityEnergy.set(e.id, e.energy)
                }
            } else {
                const container = this.buildEntitySprite(e.energy, e.dna)
                container.x = e.x
                container.y = e.y
                this.worldContainer.addChild(container)
                this.entitySprites.set(e.id, container)
                this.entityEnergy.set(e.id, e.energy)
            }
        })

        state.food.forEach(f => {
            if (!this.foodSprites.has(f.id)) {
                const g = new PIXI.Graphics()
                g.beginFill(0x44ff88, 0.8)
                g.drawCircle(0, 0, 6)
                g.endFill()
                g.x = f.x
                g.y = f.y
                this.worldContainer.addChild(g)
                this.foodSprites.set(f.id, g)
            }
        })
    }

    private updatePulses(delta: number): void {
        const duration = 40 // frames
        this.pulses = this.pulses.filter(p => {
            p.age += delta
            const progress = p.age / duration
            if (progress >= 1) {
                this.worldContainer.removeChild(p.g)
                p.g.destroy()
                return false
            }

            const radius = progress * 120
            const alpha = (1 - progress) * 0.7

            p.g.clear()
            p.g.lineStyle(2, 0xff69b4, alpha)
            p.g.drawCircle(0, 0, radius)

            // brilho interno mais rosados
            p.g.lineStyle(1, 0xffb6c1, alpha * 0.5)
            p.g.drawCircle(0, 0, radius * 0.6)

            return true
        })
    }

    triggerReproductionPulse(x: number, y: number): void {
        const g = new PIXI.Graphics()
        g.x = x
        g.y = y
        this.worldContainer.addChild(g)
        this.pulses.push({ g, x, y, age: 0 })
    }

    resize(): void {
        this.app.renderer.resize(window.innerWidth, window.innerHeight)
        this.fitWorld()
    }
}