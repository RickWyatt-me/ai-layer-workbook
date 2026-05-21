import { usePersona } from '../hooks/usePersona';

export default function TplRepo() {
  const { persona } = usePersona();
  return <>{persona.repoName || 'your-repo'}</>;
}
