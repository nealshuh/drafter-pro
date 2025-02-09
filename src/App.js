import React, { useState, useRef, useEffect } from 'react';
import {BrowserRouter, Routes, Route, useNavigate} from 'react-router-dom'
import TextEditor from './components/DrafterPro'
import BodyFatScan from './components/BodyFatScan'

const App = () => {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/draft" element={<TextEditor />} />
                <Route path="/body-fat-mvp" element={<BodyFatScan />} />
            </Routes>
        </BrowserRouter>
    );
}



export default App;