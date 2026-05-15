import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CoveragePage } from "./CoveragePage";
import { StaffShell } from "./StaffShell";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StaffShell />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
