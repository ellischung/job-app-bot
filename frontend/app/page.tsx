import ConfigForm from '@/components/ConfigForm'
import RunBotButton from '@/components/RunBotButton'
import LogsTable from '@/components/LogsTable'

export default function Page() {
  return (
    <main className="p-6 grid md:grid-cols-3 gap-6">
      <section className="md:col-span-1">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <ConfigForm />
        <RunBotButton />
      </section>
      <section className="md:col-span-2">
        <h2 className="text-xl font-bold mb-4">Applied Jobs</h2>
        <LogsTable />
      </section>
    </main>
  )
}
