import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Layout } from "@/components/layout"
import HomePage from "@/pages/home"
import RacesPage from "@/pages/races"
import RaceDetailPage from "@/pages/race-detail"
import DriversPage from "@/pages/drivers"
import DriverDetailPage from "@/pages/driver-detail"
import ConstructorsPage from "@/pages/constructors"
import ConstructorDetailPage from "@/pages/constructor-detail"
import CircuitsPage from "@/pages/circuits"
import CircuitDetailPage from "@/pages/circuit-detail"
import StandingsPage from "@/pages/standings"
import AuthPage from "@/pages/auth"
import AdminPage from "@/pages/admin"
import RivalryPage from "@/pages/rivalry"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/races" element={<RacesPage />} />
            <Route path="/races/:raceId" element={<RaceDetailPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/drivers/:driverId" element={<DriverDetailPage />} />
            <Route path="/constructors" element={<ConstructorsPage />} />
            <Route path="/constructors/:constructorId" element={<ConstructorDetailPage />} />
            <Route path="/circuits" element={<CircuitsPage />} />
            <Route path="/circuits/:circuitId" element={<CircuitDetailPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/standings/:season" element={<StandingsPage />} />
            <Route path="/rivalry" element={<RivalryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
