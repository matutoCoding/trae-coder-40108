import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Analytics from "@/pages/Analytics"
import BatchList from "@/pages/BatchList"
import BatchRegister from "@/pages/BatchRegister"
import OutboundList from "@/pages/OutboundList"
import OutboundCreate from "@/pages/OutboundCreate"
import OutboundDetail from "@/pages/OutboundDetail"
import Commission from "@/pages/Commission"
import Settlement from "@/pages/Settlement"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/batch" element={<BatchList />} />
          <Route path="/batch/register" element={<BatchRegister />} />
          <Route path="/outbound" element={<OutboundList />} />
          <Route path="/outbound/create" element={<OutboundCreate />} />
          <Route path="/outbound/:id" element={<OutboundDetail />} />
          <Route path="/commission" element={<Commission />} />
          <Route path="/settlement" element={<Settlement />} />
        </Route>
      </Routes>
    </Router>
  )
}
