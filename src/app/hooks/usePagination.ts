import { ButtonKit, OnButtonKitClick } from 'commandkit';
import { ButtonStyle, Interaction } from 'discord.js';

interface PaginationState<T> {
    data: T[][];
    page: number;
}

interface UsePaginationOptions<T> {
    filter: (interaction: Interaction) => boolean;
    onButtonClick?: OnButtonKitClick;
    timeout?: number;
}

export function usePagination<T>({
    filter,
    onButtonClick,
    timeout = 180_000,
}: UsePaginationOptions<T>) {
    const state = { data: [] as T[][], page: 0 };

    const handlePagination: OnButtonKitClick = async (
        btnInteraction,
        context,
    ) => {
        switch (btnInteraction.customId) {
            case 'first':
                state.page = 0;
                break;
            case 'prev':
                state.page = Math.max(0, state.page - 1);
                break;
            case 'next':
                state.page = Math.min(state.data.length - 1, state.page + 1);
                break;
            case 'last':
                state.page = state.data.length - 1;
                break;
        }

        updateButtonStates();
        onButtonClick?.(btnInteraction, context);
    };

    const firstButton = new ButtonKit()
        .setCustomId('first')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .filter(filter)
        .onClick(handlePagination, { time: timeout, autoReset: true });

    const prevButton = new ButtonKit()
        .setCustomId('prev')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .filter(filter)
        .onClick(handlePagination, { time: timeout, autoReset: true });

    const nextButton = new ButtonKit()
        .setCustomId('next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .filter(filter)
        .onClick(handlePagination, { time: timeout, autoReset: true });

    const lastButton = new ButtonKit()
        .setCustomId('last')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .filter(filter)
        .onClick(handlePagination, { time: timeout, autoReset: true });

    const updateButtonStates = () => {
        const isFirstPage = state.page === 0;
        const isLastPage = state.page === state.data.length - 1;

        firstButton.setDisabled(isFirstPage);
        prevButton.setDisabled(isFirstPage);
        nextButton.setDisabled(isLastPage);
        lastButton.setDisabled(isLastPage);
    };

    const updateState = (newState: PaginationState<T>) => {
        state.data = newState.data;
        state.page = newState.page;
        updateButtonStates();
    };

    return {
        state,
        buttons: [firstButton, prevButton, nextButton, lastButton],
        updateState,
    };
}
