import { useEffect, useRef, useState } from "react"
import { WorldState, TribeData } from "../renderer/PixiRenderer"

const WORLD_WIDTH = 25600
const WORLD_HEIGHT = 19200
const MAP_WIDTH = 200
const MAP_HEIGHT = 150

interface Props {
    state: WorldState | null
    fertileRegions: { x: number; y: number }[]
    cameraRect: { x: number; y: number; w: number; h: number }
    tribes: TribeData[]
}

export default function MinimapPanel({ state, fertileRegions, cameraRect, tribes }: Props) {
    const [open, setOpen] = useState(true)
    const [show, setShow] = useState({ creatures: true, food: true, fertile: true, tribes: true })
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")!
        ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

        const scaleX = MAP_WIDTH / WORLD_WIDTH
        const scaleY = MAP_HEIGHT / WORLD_HEIGHT

        ctx.fillStyle = "#0a0a0f"
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

        if (show.fertile) {
            fertileRegions.forEach(r => {
                const grd = ctx.createRadialGradient(
                    r.x * scaleX, r.y * scaleY, 0,
                    r.x * scaleX, r.y * scaleY, 4000 * scaleX
                )
                grd.addColorStop(0, "rgba(68, 255, 136, 0.15)")
                grd.addColorStop(1, "rgba(68, 255, 136, 0)")
                ctx.fillStyle = grd
                ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
            })
        }

        if (show.tribes) {
            tribes.forEach((t: TribeData) => {
                const tx = t.centerX * scaleX
                const ty = t.centerY * scaleY
                const tr = t.radius * scaleX

                const r = (t.color >> 16) & 0xff
                const g = (t.color >> 8) & 0xff
                const b = t.color & 0xff

                const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr)
                grd.addColorStop(0, `rgba(${r},${g},${b},0.25)`)
                grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
                ctx.fillStyle = grd
                ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

                ctx.beginPath()
                ctx.arc(tx, ty, 2, 0, Math.PI * 2)
                ctx.fillStyle = `rgb(${r},${g},${b})`
                ctx.fill()
            })
        }

        if (show.food && state?.food) {
            ctx.fillStyle = "rgba(68, 255, 136, 0.6)"
            state.food.forEach(f => {
                ctx.fillRect(f.x * scaleX - 0.5, f.y * scaleY - 0.5, 1, 1)
            })
        }

        if (show.creatures && state?.entities) {
            state.entities.forEach(e => {
                const color = e.tribeId !== null
                    ? `rgba(255,255,255,0.9)`
                    : `rgba(255,255,255,0.5)`
                ctx.fillStyle = color
                ctx.fillRect(e.x * scaleX - 1, e.y * scaleY - 1, 2, 2)
            })
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
        ctx.lineWidth = 1
        ctx.strokeRect(
            cameraRect.x * scaleX,
            cameraRect.y * scaleY,
            cameraRect.w * scaleX,
            cameraRect.h * scaleY
        )
    }, [state, fertileRegions, show, cameraRect, tribes])

    return (
        <div style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 100,
            fontFamily: "monospace",
            fontSize: 13,
        }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: "rgba(10,10,20,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "monospace",
                    marginBottom: 4,
                    display: "block",
                    marginLeft: "auto",
                }}
            >
                {open ? "↑ mapa" : "↓ mapa"}
            </button>

            {open && (
                <div style={{
                    background: "rgba(10,10,20,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}>
                    <canvas
                        ref={canvasRef}
                        width={MAP_WIDTH}
                        height={MAP_HEIGHT}
                        style={{ borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        {(["creatures", "food", "fertile", "tribes"] as const).map(key => (
                            <label key={key} style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: 11,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                            }}>
                                <input
                                    type="checkbox"
                                    checked={show[key]}
                                    onChange={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                                    style={{ cursor: "pointer" }}
                                />
                                {key === "creatures" ? "criaturas" : key === "food" ? "comida" : key === "fertile" ? "férteis" : "tribos"}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}