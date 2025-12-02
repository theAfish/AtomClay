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
        const { findByTitle, getByText, getAllByText, container } = render(
            <I18nextProvider i18n={i18n}>
                <MolecularProvider>
                    <LeftPanel />
                </MolecularProvider>
            </I18nextProvider>
        );

        // Double-click the layer label to start editing
        // There are two occurrences of "Layer 1" in the panel (Active Layer header and list item).
        // Pick the list entry which uses the .truncate class so the test double-clicks the list item.
        const labels = getAllByText('Layer 1');
        const label = labels.find(el => el.classList && el.classList.contains('truncate')) || labels[0];
        expect(label).toBeTruthy();
        fireEvent.doubleClick(label);

        // Input should appear
        const input = container.querySelector('input[type="text"]');
        expect(input).toBeTruthy();

        // While editing, the "Use Lattice" and "Delete Layer" buttons should be invisible
        const deleteBtn = container.querySelector('button[title="Delete Layer"]');
        expect(deleteBtn).toBeTruthy();
        // Tailwind `invisible` class is used to hide the buttons. Tests don't load CSS so
        // check the class name instead of computed style.
        expect(deleteBtn.classList.contains('invisible')).toBe(true);

        const useLatBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Use Lattice'));
        if (useLatBtn) {
            expect(useLatBtn.classList.contains('invisible')).toBe(true);
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

        // Achieve: Layer name should be updated — choose the list entry (uses .truncate) when multiple matches exist
        const renamedLabels = getAllByText('Renamed Layer');
        const renamedLabel = renamedLabels.find(el => el.classList && el.classList.contains('truncate')) || renamedLabels[0];
        expect(renamedLabel).toBeTruthy();

        // After saving, the Delete and Use Lattice buttons should be visible again
        const deleteBtnAfter = container.querySelector('button[title="Delete Layer"]');
        expect(deleteBtnAfter).toBeTruthy();
        expect(deleteBtnAfter.classList.contains('invisible')).toBe(false);
        const useLatBtnAfter = Array.from(container.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Use Lattice'));
        if (useLatBtnAfter) {
            expect(useLatBtnAfter.classList.contains('invisible')).toBe(false);
        }

        // Ensure the header (Active Layer) is not itself showing an input (editing box) when the list item was edited
        // `Active Layer` text may be split by DOM nodes so use a regex match
        const headerLabel = getByText(/Active Layer/);
        const headerParagraph = headerLabel.closest('p');
        expect(headerParagraph.querySelector('input[type="text"]')).toBeNull();
    });
});
