'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

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

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setCfg)
  }, [])

  if (!cfg) return <p className="text-green-400 font-mono">Loading…</p>

  const onChange = (k: keyof Config, v: any) =>
    setCfg(c => c ? { ...c, [k]: v } : c)

  const save = async () => {
    setStatus('Saving…')
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setStatus('Saved!')
    setTimeout(() => setStatus(''), 2000)
  }

  return (
    <Card className="bg-gray-800 border-gray-700 font-mono">
      <CardHeader>
        <CardTitle className="text-green-400">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-green-300">Name</Label>
          <Input
            className="bg-gray-900 text-green-100"
            value={cfg.name}
            onChange={e => onChange('name', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-green-300">Email</Label>
          <Input
            type="email"
            className="bg-gray-900 text-green-100"
            value={cfg.email}
            onChange={e => onChange('email', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-green-300">Phone</Label>
          <Input
            className="bg-gray-900 text-green-100"
            value={cfg.phone}
            onChange={e => onChange('phone', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-green-300">Home Address</Label>
          <Input
            className="bg-gray-900 text-green-100"
            value={cfg.home_address}
            onChange={e => onChange('home_address', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-green-300">Resume Path</Label>
          <Input
            className="bg-gray-900 text-green-100"
            value={cfg.resume_path}
            onChange={e => onChange('resume_path', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-green-300">Keywords</Label>
          <Textarea
            className="bg-gray-900 text-green-100"
            rows={2}
            value={cfg.linkedin_keywords.join(', ')}
            onChange={e =>
              onChange(
                'linkedin_keywords',
                e.target.value.split(',').map(s => s.trim())
              )
            }
          />
        </div>
        <div>
          <Label className="text-green-300">Location</Label>
          <Input
            className="bg-gray-900 text-green-100"
            value={cfg.location}
            onChange={e => onChange('location', e.target.value)}
          />
        </div>
        <Button
          onClick={save}
          className="bg-green-600 hover:bg-green-700 text-black cursor-pointer"
        >
          Save
        </Button>
        {status && (
          <p className="text-sm text-green-400 font-mono">{status}</p>
        )}
      </CardContent>
    </Card>
  )
}
