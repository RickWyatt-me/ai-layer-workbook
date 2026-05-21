import { useAgent } from '../hooks/useAgent';

export default function TplAgent() {
  const { agent } = useAgent();
  return <>{agent}</>;
}
