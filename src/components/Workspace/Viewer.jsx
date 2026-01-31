import React from 'react';
import { ViewerProvider } from './Viewer/ViewerContext';
import ViewerCanvas from './Viewer/ViewerCanvas';
import ViewerScene from './Viewer/ViewerScene';
import ViewerControls from './Viewer/ViewerControls';

const Viewer = () => {
    return (
        <ViewerProvider>
            <div className="w-full h-full relative">
                <ViewerCanvas />
                <ViewerScene />
                <ViewerControls />
            </div>
        </ViewerProvider>
    );
};

export default Viewer;
