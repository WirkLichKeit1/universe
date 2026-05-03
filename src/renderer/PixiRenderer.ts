import * as PIXI from "pixi.js"

export interface EntityData {
    id: number
    x: number
    y: number
    energy: number
}

export interface FoodData {
    id: number
    x: number
    y: number
}

export interface WorldState {
    entities: EntityData[]
    food: FoodData[]
}

const WORLD_WIDTH = 3200
const WORLD_HEIGHT = 2400
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ENERGY_MAX = 250

export class PixiRenderer {
    private app: PIXI.Application
    private entitySprites: Map<number, PIXI.Container> = new Map()
    private entityEnergy: Map<number, number> = new Map()
    private foodSprites: Map<number, PIXI.Graphics> = new Map()
    private worldContainer: PIXI.Container
    private scale: number = 1
    private dragging: boolean = false
    private dragStart: { x: number; y: number } = { x: 0, y: 0 }
    private containerStart: { x: number; y: number } = { x: 0, y: 0 }

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
    }

    private fitWorld(): void {
        const scaleX = window.innerWidth / WORLD_WIDTH
        const scaleY = window.innerHeight / WORLD_HEIGHT
        this.scale = Math.min(scaleX, scaleY) * 0.9

        this.worldContainer.scale.set(this.scale)
        this.worldContainer.x = (window.innerWidth - WORLD_WIDTH * this.scale) / 2
        this.worldContainer.y = (window.innerHeight - WORLD_HEIGHT * this.scale) / 2
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
            this.worldContainer.x = this.containerStart.x + (e.clientX - this.dragStart.x)
            this.worldContainer.y = this.containerStart.y + (e.clientY - this.dragStart.y)
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

    private getEnergyColor(energy: number): number {
        if (energy > 150) return 0x1d9e75
        if (energy > 80) return 0xef9f27
        return 0x7f77dd
    }

    private buildEntitySprite(energy: number): PIXI.Container {
        const container = new PIXI.Container()
        const color = this.getEnergyColor(energy)
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
                    const newContainer = this.buildEntitySprite(e.energy)
                    newContainer.x = e.x
                    newContainer.y = e.y
                    this.worldContainer.addChild(newContainer)
                    this.entitySprites.set(e.id, newContainer)
                    this.entityEnergy.set(e.id, e.energy)
                }
            } else {
                const container = this.buildEntitySprite(e.energy)
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

    resize(): void {
        this.app.renderer.resize(window.innerWidth, window.innerHeight)
        this.fitWorld()
    }
}