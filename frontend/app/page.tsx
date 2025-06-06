import ConfigForm from '@/components/ConfigForm'
import BotTerminal from '@/components/BotTerminal'
import LogsTable from '@/components/LogsTable'

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-900 text-green-200 font-mono p-6 grid md:grid-cols-3 gap-6">
      <section className="md:col-span-1 space-y-4">
        <ConfigForm />
        <BotTerminal />
      </section>
      <section className="md:col-span-2">
        <LogsTable />
      </section>
    </main>
  )
}
