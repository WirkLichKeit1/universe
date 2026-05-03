import { useEffect, useRef, useState } from "react"
import { PixiRenderer, WorldState } from "./renderer/PixiRenderer"
import StatsPanel from "./components/StatsPanel"

const WS_URL = "wss://universe-engine.onrender.com"

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<PixiRenderer | null>(null)
    const [worldState, setWorldState] = useState<WorldState | null>(null)

    useEffect(() => {
        if (!canvasRef.current) return

        const renderer = new PixiRenderer(canvasRef.current)
        rendererRef.current = renderer

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
        </>
    )
}