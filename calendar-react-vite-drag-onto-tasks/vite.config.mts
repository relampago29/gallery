import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins      : [react()],
    optimizeDeps : {
        include : ['@bryntum/calendar', '@bryntum/calendar-react']
    },
    base  : '',
    build : {
        // Suppress warning for chunk size
        chunkSizeWarningLimit : 10000,

        // Turn warnings into errors
        // https://rollupjs.org/configuration-options/#onlog
        rollupOptions : {
            onLog(level, log, handler) {
                if (level === 'warn') {
                    handler('error', log);
                }
                else {
                    handler(level, log);
                }
            }
        }
    }
});
