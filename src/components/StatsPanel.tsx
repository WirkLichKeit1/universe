import { useState } from "react"
import { WorldState } from "../renderer/PixiRenderer"

interface Props {
    state: WorldState | null
}

export default function StatsPanel({ state }: Props) {
    const [open, setOpen] = useState(true)

    const population = state?.entities.length ?? 0
    const avgEnergy = state?.entities.length
        ? (state.entities.reduce((sum, e) => sum + e.energy, 0) / state.entities.length).toFixed(1)
        : "0"
    const foodCount = state?.food.length ?? 0

    const avgSpeed = state?.entities.length
        ? (state.entities.reduce((sum, e) => sum + (e.dna?.speed ?? 0), 0) / state.entities.length).toFixed(1)
        : "0"
    const avgVision = state?.entities.length
        ? (state.entities.reduce((sum, e) => sum + (e.dna?.visionRadius ?? 0), 0) / state.entities.length).toFixed(1)
        : "0"

    return (
        <div style={{
            position: "fixed",
            top: 16,
            left: 16,
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
                }}
            >
                {open ? "↑ stats" : "↓ stats"}
            </button>

            {open && (
                <div style={{
                    background: "rgba(10,10,20,0.85)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "white",
                    minWidth: 180,
                    lineHeight: 1.8,
                }}>
                    <Row label="população" value={population} />
                    <Row label="comida" value={foodCount} />
                    <Divider />
                    <Row label="energia média" value={avgEnergy} />
                    <Divider />
                    <Row label="velocidade média" value={avgSpeed} />
                    <Row label="visão média" value={avgVision} />
                </div>
            )}
        </div>
    )
}

function Row({ label, value }: { label: string, value: string | number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16}}>
            <span style={{ color: "rgba(255,255,255,0.5"}}>{label}</span>
            <span>{value}</span>
        </div>
    )
}

function Divider() {
    return <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "6px 0" }} />
}