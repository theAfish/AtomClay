import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MolecularProvider } from '../context/MolecularContext';
import RightPanel from '../components/RightPanel';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

describe('Layers panel rename UI (moved to right panel)', () => {
    it('should allow renaming a layer via UI', async () => {
        // Ensure english locale for test
        i18n.changeLanguage('en');
        const { findByTitle, getByText, getAllByText, container } = render(
            <I18nextProvider i18n={i18n}>
                <MolecularProvider>
                    <RightPanel />
                </MolecularProvider>
            </I18nextProvider>
        );

        // Double-click the layer label to start editing — this is in the right panel now
        const labels = getAllByText('Layer 1');
        const label = labels.find(el => el.classList && el.classList.contains('truncate')) || labels[0];
        expect(label).toBeTruthy();
        fireEvent.doubleClick(label);

        // Input should appear
        const input = container.querySelector('input[type="text"]');
        expect(input).toBeTruthy();

        // While editing, the "Use Lattice" and "Delete Layer" buttons should be removed from DOM
        const deleteBtn = container.querySelector('button[title="Delete Layer"]');
        expect(deleteBtn).toBeNull();

        const useLatBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Use Lattice'));
        expect(useLatBtn).toBeUndefined();

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

        // Ensure the header (Active Layer) on the left panel is not itself showing an input (editing box) when the list item was edited
        // `Active Layer` text may be split by DOM nodes so use a regex match
        const leftPanelActive = container.ownerDocument.querySelector('.absolute.top-4.left-4');
        const headerLabel = leftPanelActive ? leftPanelActive.querySelector('p') : null;
        if (headerLabel) {
            expect(headerLabel.querySelector('input[type="text"]')).toBeNull();
        }
    });
});
