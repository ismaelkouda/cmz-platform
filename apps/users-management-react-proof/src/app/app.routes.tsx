import { Navigate, Route, Routes } from 'react-router';

import { AppAccessGate } from './access-policy';
import { Pagepage6666666666666666 } from './pages/page_6666666666666666/page';

export function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/settings-security/users"
                element={
                    <AppAccessGate
                        policy={{ mode: 'authenticated', permissions: [] }}
                    >
                        <Pagepage6666666666666666 />
                    </AppAccessGate>
                }
            />
            <Route
                path="*"
                element={<Navigate replace to="/settings-security/users" />}
            />
        </Routes>
    );
}
