'use client'
import { useEffect, useState } from 'react'

type Config = {
  name: string
  email: string
  phone: string
  home_address: string
  resume_path: string
  linkedin_email: string
  linkedin_password: string
  linkedin_keywords: string[]
  location: string
}

export default function ConfigForm() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [status, setStatus] = useState<string>('')

  // 1) fetch on mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setCfg)
  }, [])

  if (!cfg) return <p>Loading…</p>

  // 2) handle field changes
  const onChange = (k: keyof Config, v: any) =>
    setCfg(c => c ? { ...c, [k]: v } : c)

  // 3) submit via PUT
  const save = async () => {
    setStatus('Saving…')
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    })
    setStatus('Saved!')
    setTimeout(() => setStatus(''), 2000)
  }

  return (
    <div className="space-y-4">
      <input
        className="w-full border p-2"
        placeholder="Your Name"
        value={cfg.name}
        onChange={e => onChange('name', e.target.value)}
      />
      <input
        className="w-full border p-2"
        type="email"
        placeholder="Email"
        value={cfg.email}
        onChange={e => onChange('email', e.target.value)}
      />
      {/* repeat for phone, home_address, resume_path… */}
      <textarea
        className="w-full border p-2"
        placeholder="Keywords (comma‑separated)"
        value={cfg.linkedin_keywords.join(', ')}
        onChange={e => onChange(
          'linkedin_keywords',
          e.target.value.split(',').map(s => s.trim())
        )}
      />
      <input
        className="w-full border p-2"
        placeholder="Location"
        value={cfg.location}
        onChange={e => onChange('location', e.target.value)}
      />

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={save}
      >
        Save Settings
      </button>
      {status && <p className="text-sm text-green-600">{status}</p>}
    </div>
  )
}
