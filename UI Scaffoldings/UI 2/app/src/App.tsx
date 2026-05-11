import { useState } from 'react';
import type { Brief } from './data';
import CoverScreen from './screens/CoverScreen';
import ConsultScreen from './screens/ConsultScreen';
import GeneratingScreen from './screens/GeneratingScreen';
import VisionsScreen from './screens/VisionsScreen';
import WorkspaceScreen from './screens/WorkspaceScreen';
import ExportScreen from './screens/ExportScreen';

const DEFAULT_BRIEF: Brief = {
  vibe: '',
  room: '',
  size: '',
  who: '',
  chips: [],
  budget: 300000,
  city: '',
};

export default function App() {
  const [screen, setScreen] = useState('cover');
  const [brief, setBrief] = useState<Brief>(DEFAULT_BRIEF);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {screen === 'cover' && <CoverScreen onNav={setScreen} />}
      {screen === 'consult' && (
        <ConsultScreen onNav={setScreen} brief={brief} setBrief={setBrief} />
      )}
      {screen === 'draft' && <GeneratingScreen onNav={setScreen} />}
      {screen === 'visions' && <VisionsScreen onNav={setScreen} />}
      {screen === 'workspace' && <WorkspaceScreen onNav={setScreen} />}
      {screen === 'export' && <ExportScreen onNav={setScreen} />}
    </div>
  );
}
