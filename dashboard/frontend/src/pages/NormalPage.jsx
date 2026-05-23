import AlertTable from '../components/AlertTable'
import ThresholdForm from '../components/ThresholdForm'

export default function NormalPage() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <AlertTable />
      <ThresholdForm />
    </div>
  )
}
