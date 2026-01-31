import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';

const FooterHelp = () => {
    const { t } = useTranslation();
    const { transformMode } = useMolecularContext();

    const action = transformMode === 'translate' 
        ? t('Move') 
        : t(transformMode.charAt(0).toUpperCase() + transformMode.slice(1));

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] pointer-events-none bg-black/20 px-2 rounded">
            {t('Mouse Instructions', { action })}
        </div>
    );
};

export default FooterHelp;
