import { useEffect, useRef, useState } from "react"
import { PixiRenderer, WorldState } from "./renderer/PixiRenderer"
import StatsPanel from "./components/StatsPanel"

const WS_URL = "wss://universe-engine.onrender.com"

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<PixiRenderer | null>(null)
    const [worldState, setWorldState] = useState<WorldState | null>(null)
    const [followingId, setFollowingId] = useState<number | null>(null)

    useEffect(() => {
        if (!canvasRef.current) return

        const renderer = new PixiRenderer(canvasRef.current)
        rendererRef.current = renderer
        renderer.setOnFollowChange(setFollowingId)

        const ws = new WebSocket(WS_URL)

        ws.onopen = () => console.log("Conectado à engine")
        ws.onclose = () => console.log("Desconectado")
        ws.onerror = (e) => console.error("Erro WebSocket:", e)

        ws.onmessage = (event) => {
            const state: WorldState = JSON.parse(event.data)
            renderer.update(state)
            setWorldState(state)
        }

        const handleResize = () => renderer.resize()
        window.addEventListener("resize", handleResize)

        return () => {
            ws.close()
            window.removeEventListener("resize", handleResize)
        }
    }, [])
    
    return (
        <>
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100vw", height: "100vh" }}
            />
            <StatsPanel state={worldState} />
            {followingId !== null && (
                <div style={{
                    position: "fixed",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(10,10,20,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "6px 16px",
                    color: "white",
                    fontFamily: "monospace",
                    fontSize: 13,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                }}>
                    <span style={{ color: "rgba(255,255,255,0.5" }}>Seguindo criatura</span>
                    <span>#{followingId}</span>
                    <button
                        onClick={() => rendererRef.current?.followCreature(null)}
                        style={{
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "white",
                                  borderRadius: 4,
                            padding: "2px 8px",
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: 12,
                        }}
                    >
                        soltar
                    </button>
                </div>
            )}
        </>
    )
}