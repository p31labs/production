import { lazy, Suspense } from 'react';
import { SuspenseLoader } from '../components/SuspenseLoader';
import DesignRoute from '../routes/DesignRoute/DesignRoute';

function DesignApp() {
  return (
    <div className="portal-shell">
      <main id="main-content" className="viewport">
        <Suspense fallback={<SuspenseLoader />}>
          <DesignRoute />
        </Suspense>
      </main>
    </div>
  );
}

export default DesignApp;
