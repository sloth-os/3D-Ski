import { useEffect, useState } from 'react'

type InstallEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export function useOffline() {
  const [cached, setCached] = useState(false),
    [online, setOnline] = useState(navigator.onLine)
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches,
  )
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  useEffect(() => {
    let active = true
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register(import.meta.env.BASE_URL + 'sw.js', {
          scope: import.meta.env.BASE_URL,
        })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (active) setCached(true)
        })
        .catch(() => {})
    }
    const net = () => setOnline(navigator.onLine)
    const install = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallEvent)
    }
    const done = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('online', net)
    window.addEventListener('offline', net)
    window.addEventListener('beforeinstallprompt', install)
    window.addEventListener('appinstalled', done)
    return () => {
      active = false
      window.removeEventListener('online', net)
      window.removeEventListener('offline', net)
      window.removeEventListener('beforeinstallprompt', install)
      window.removeEventListener('appinstalled', done)
    }
  }, [])
  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }
  return { cached, online, installed, canInstall: !!installEvent, install }
}
