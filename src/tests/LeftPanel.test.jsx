import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MolecularProvider } from '../context/MolecularContext';
import LeftPanel from '../components/LeftPanel';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

describe('LeftPanel rename UI', () => {
    it('should allow renaming a layer via UI', async () => {
        // Ensure english locale for test
        i18n.changeLanguage('en');
        const { findByTitle, getByText, container } = render(
            <I18nextProvider i18n={i18n}>
                <MolecularProvider>
                    <LeftPanel />
                </MolecularProvider>
            </I18nextProvider>
        );

        // Double-click the layer label to start editing
        const label = getByText('Layer 1');
        expect(label).toBeTruthy();
        fireEvent.doubleClick(label);

        // Input should appear
        const input = container.querySelector('input[type="text"]');
        expect(input).toBeTruthy();

        // While editing, the "Use Lattice" and "Delete Layer" buttons should be invisible
        const deleteBtn = container.querySelector('button[title="Delete Layer"]');
        expect(deleteBtn).toBeTruthy();
        expect(getComputedStyle(deleteBtn).visibility).toBe('hidden');

        const useLatBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Use Lattice'));
        if (useLatBtn) {
            expect(getComputedStyle(useLatBtn).visibility).toBe('hidden');
        }

        fireEvent.change(input, { target: { value: 'Renamed Layer' } });
        // Save button (title 'Save') should exist
        const checkBtn = await findByTitle('Save').catch(() => container.querySelector('button[title="Save"]'));
        if (checkBtn) {
            fireEvent.click(checkBtn);
        } else {
            // if no title on check, click the second button in the input group (save)
            const buttons = container.querySelectorAll('.flex.items-center.gap-2 button');
            if (buttons && buttons.length > 0) fireEvent.click(buttons[0]);
        }

        // Achieve: Layer name should be updated
        expect(getByText('Renamed Layer')).toBeTruthy();

        // After saving, the Delete and Use Lattice buttons should be visible again
        const deleteBtnAfter = container.querySelector('button[title="Delete Layer"]');
        expect(deleteBtnAfter).toBeTruthy();
        expect(getComputedStyle(deleteBtnAfter).visibility).toBe('visible');
        const useLatBtnAfter = Array.from(container.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Use Lattice'));
        if (useLatBtnAfter) {
            expect(getComputedStyle(useLatBtnAfter).visibility).toBe('visible');
        }

        // Ensure the header (Active Layer) is not itself showing an input (editing box) when the list item was edited
        const headerLabel = getByText('Active Layer');
        const headerParagraph = headerLabel.closest('p');
        expect(headerParagraph.querySelector('input[type="text"]')).toBeNull();
    });
});
