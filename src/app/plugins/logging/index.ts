import {
    type CommandKitPluginRuntime,
    RuntimePlugin,
    Logger,
    type ILogger,
} from 'commandkit';
import type { Interaction } from 'discord.js';
import { type Configuration } from 'log4js';
import log4js from 'log4js';

export interface LoggingPluginOptions {
    log4jsConfig?: Configuration;
    log4jsConfigPath?: string;
}

export class Log4jsAdapter implements ILogger {
    private logger: log4js.Logger;

    constructor(logger: log4js.Logger) {
        this.logger = logger;
    }

    log(message: any): void;
    log(strings: TemplateStringsArray, ...values: any[]): void;
    log(messageOrStrings: any, ...values: any[]): void {
        this.logger.info.apply(this.logger, [messageOrStrings, ...values]);
    }

    error(message: any): void;
    error(strings: TemplateStringsArray, ...values: any[]): void;
    error(messageOrStrings: any, ...values: any[]): void {
        this.logger.error.apply(this.logger, [messageOrStrings, ...values]);
    }

    warn(message: any): void;
    warn(strings: TemplateStringsArray, ...values: any[]): void;
    warn(messageOrStrings: any, ...values: any[]): void {
        this.logger.warn.apply(this.logger, [messageOrStrings, ...values]);
    }

    info(message: any): void;
    info(strings: TemplateStringsArray, ...values: any[]): void;
    info(messageOrStrings: any, ...values: any[]): void {
        this.logger.info.apply(this.logger, [messageOrStrings, ...values]);
    }

    debug(message: any): void;
    debug(strings: TemplateStringsArray, ...values: any[]): void;
    debug(messageOrStrings: any, ...values: any[]): void {
        this.logger.debug.apply(this.logger, [messageOrStrings, ...values]);
    }
}

export class LoggingPlugin extends RuntimePlugin<LoggingPluginOptions> {
    name = 'logging';

    private logger!: log4js.Logger;
    private errorLogger!: log4js.Logger;
    private sqlLogger!: log4js.Logger;

    async activate(ctx: CommandKitPluginRuntime): Promise<void> {
        if (this.options.log4jsConfigPath)
            log4js.configure(this.options.log4jsConfigPath);
        else if (this.options.log4jsConfig)
            log4js.configure(this.options.log4jsConfig);

        this.logger = log4js.getLogger('default');
        this.errorLogger = log4js.getLogger('error');
        this.sqlLogger = log4js.getLogger('sql');

        Logger.configure({
            provider: new Log4jsAdapter(this.logger),
        });

        ctx.commandkit.store.set('logger', this.logger);
        ctx.commandkit.store.set('errorLogger', this.errorLogger);
        ctx.commandkit.store.set('sqlLogger', this.sqlLogger);
    }

    async onAfterClientLogin(ctx: CommandKitPluginRuntime): Promise<void> {
        Logger.info(`Bot logged in as ${ctx.commandkit.client.user?.tag}!`);
        Logger.info(
            `Serving ${ctx.commandkit.client.guilds.cache.size} guilds`,
        );
    }

    async onBeforeInteraction(
        ctx: CommandKitPluginRuntime,
        interaction: Interaction,
    ): Promise<void> {
        if (interaction.isCommand()) {
            Logger.info(
                `[${interaction.commandName}] Command used by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild?.name ?? 'DM'} (${interaction.guildId ?? 'DM'})`,
            );
        }
    }
}

export function logging(options?: LoggingPluginOptions) {
    return new LoggingPlugin(options ?? {});
}
