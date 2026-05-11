import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import CoverPage from './pages/CoverPage';
import IntakePage from './pages/IntakePage';
import DraftingPage from './pages/DraftingPage';
import RevealPage from './pages/RevealPage';
import StudioPage from './pages/StudioPage';
import ExportPage from './pages/ExportPage';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  duration: 0.4,
  ease: [0.22, 0.7, 0, 1.05] as [number, number, number, number],
};

export default function App() {
  const screen = useStore((s) => s.screen);

  const renderPage = () => {
    switch (screen) {
      case 'cover':
        return <CoverPage key="cover" />;
      case 'intake':
        return <IntakePage key="intake" />;
      case 'drafting':
        return <DraftingPage key="drafting" />;
      case 'reveal':
        return <RevealPage key="reveal" />;
      case 'studio':
        return <StudioPage key="studio" />;
      case 'export':
        return <ExportPage key="export" />;
      default:
        return <CoverPage key="cover" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}
