import AwsStatusGrid from '../components/AwsStatusGrid'
import DeviceStatus from '../components/DeviceStatus'
import TemplateEditor from '../components/TemplateEditor'

export default function DebugPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AwsStatusGrid />
      <DeviceStatus />
      <TemplateEditor />
    </div>
  )
}
