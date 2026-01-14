import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import ChatApp from './components/chat-app'
import Register from './pages/register'
import Login from './pages/login'

function App() {
	return (
		<div>
			<BrowserRouter>
				<Routes>
					<Route path='/' element={<ChatApp />} />
					<Route path='/login' element={<Login />} />
					<Route path='/register' element={<Register />} />
				</Routes>
			</BrowserRouter>
			<Toaster />
		</div>
	)
}

export default App
