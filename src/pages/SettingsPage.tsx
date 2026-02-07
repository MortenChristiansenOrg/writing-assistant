import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PersonaManager } from '@/components/personas/PersonaManager'
import { SpendingDashboard } from '@/components/settings/SpendingDashboard'
import { toast } from 'sonner'
import { Eye, EyeOff, Key, Save, Trash2 } from 'lucide-react'
import { MODELS } from '@/lib/models'

export function SettingsPage() {
  const settings = useQuery(api.userSettings.get)
  const upsertSettings = useMutation(api.userSettings.upsert)
  const clearApiKey = useMutation(api.userSettings.clearApiKey)

  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [spendingThreshold, setSpendingThreshold] = useState('')

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('API key is required')
      return
    }
    try {
      await upsertSettings({ vaultKeyId: apiKey.trim() })
      setApiKey('')
      toast.success('API key saved')
    } catch {
      toast.error('Failed to save API key')
    }
  }

  const handleClearApiKey = async () => {
    try {
      await clearApiKey()
      toast.success('API key removed')
    } catch {
      toast.error('Failed to remove API key')
    }
  }

  const handleSaveModel = async (model: string) => {
    try {
      await upsertSettings({ defaultModel: model })
      toast.success('Default model updated')
    } catch {
      toast.error('Failed to update model')
    }
  }

  const handleSaveThreshold = async () => {
    const threshold = parseFloat(spendingThreshold)
    if (isNaN(threshold) || threshold <= 0) {
      toast.error('Invalid threshold')
      return
    }
    try {
      await upsertSettings({ spendingThreshold: threshold })
      setSpendingThreshold('')
      toast.success('Spending threshold updated')
    } catch {
      toast.error('Failed to update threshold')
    }
  }

  return (
    <div className="container max-w-4xl px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Enter your OpenRouter API key. You can get one at{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              openrouter.ai/keys
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.vaultKeyId ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm">
                <Key className="mr-2 inline h-4 w-4" />
                API key configured
              </div>
              <Button variant="outline" onClick={handleClearApiKey}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSaveApiKey}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Model</CardTitle>
          <CardDescription>
            Choose the default AI model for text rewriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings?.defaultModel ?? 'anthropic/claude-sonnet-4'}
            onValueChange={handleSaveModel}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}{' '}
                  <span className="text-muted-foreground">
                    (${model.input}/${model.output})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending Threshold</CardTitle>
          <CardDescription>
            Set a daily spending warning threshold (USD)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">
              Current: ${settings?.spendingThreshold?.toFixed(2) ?? '1.00'}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={spendingThreshold}
              onChange={(e) => setSpendingThreshold(e.target.value)}
              placeholder="New threshold"
              className="w-32"
            />
            <Button variant="outline" onClick={handleSaveThreshold}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>Track your AI usage and costs</CardDescription>
        </CardHeader>
        <CardContent>
          <SpendingDashboard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <CardDescription>
            Create custom personas to influence AI writing style
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonaManager />
        </CardContent>
      </Card>
    </div>
  )
}
