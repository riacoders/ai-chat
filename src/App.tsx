import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import ChatApp from './components/chat-app'

function App() {
	return (
		<div>
			<BrowserRouter>
				<Routes>
					<Route path='/' element={<ChatApp />} />
				</Routes>
			</BrowserRouter>
			<Toaster />
		</div>
	)
}

export default App
