import { useCommandKit } from 'commandkit/hooks';
import type { Logger } from 'log4js';

export function useLogger() {
    const commandkit = useCommandKit();
    const logger = commandkit.store.get('logger') as Logger;
    const errorLogger = commandkit.store.get('errorLogger') as Logger;
    const sqlLogger = commandkit.store.get('sqlLogger') as Logger;

    if (!logger || !errorLogger || !sqlLogger)
        throw new Error('Logger not initialized');

    return {
        logger,
        errorLogger,
        sqlLogger,
    };
}
