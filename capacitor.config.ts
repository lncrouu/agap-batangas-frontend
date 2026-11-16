import type { CapacitorConfig } from '@capacitor/cli';

const isLocalTest = process.env.AGAP_CAPACITOR_LOCAL_TEST === 'true';

const config: CapacitorConfig = {
  appId: 'ph.project.agap.batangas',
  appName: 'Project AGAP',
  webDir: 'build',
  ...(isLocalTest ? { server: { androidScheme: 'http' } } : {})
};

export default config;
