import { CallEnd, Phone } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, AlertColor, AlertTitle, Box, Button, Snackbar } from '@mui/material'
import { SyntheticEvent, useRef, useState } from 'react'
import WebrtcSession, { WebrtcOptions } from './webrtc/connection';

type FeedbackTitle = "Error" | "Success" | "Warning";

type Feedback = {
	open?: boolean
	title: FeedbackTitle,
	message: string,
	severity: AlertColor
}

function App() {
	const [session, setSession] = useState<WebrtcSession | undefined>(undefined);
	const [url, setUrl] = useState("ws://192.168.2.113:8080/stream/webrtc");
	const [mainCamera, setMainCamera] = useState<boolean>(true);
	const [loadingArray, setLoadingArray] = useState<Array<boolean>>([false, false]);

	const [feedbackInfo, setFeedbackInfo] = useState<Feedback>({
		open: false,
		title: 'Success',
		message: "",
		severity: "success"
	})

	const [options, setOptions] = useState<WebrtcOptions>({
		iceServers: [{urls: ["stun:stun.l.google.com:19302"]}],
		resolution: "35",
		useH264: true
	})

	const streamRef = useRef<HTMLVideoElement>(null);

	const onStream = async (stream: MediaProvider) => {
		if(!streamRef)
			return;

		if(!streamRef.current)
			return;

		streamRef.current.srcObject = stream;
		await streamRef.current.play();
	}

	const onCall = async () => {
		let newSession = new WebrtcSession(url, options);
		newSession.setOnStreamCallback(onStream);

		setLoading(true, 0);

		try {
			await newSession.call();
			setSession(newSession);
		} catch(error: any) {
			openFeedback({
				message: String(error.message),
				severity: "error",
				title: 'Error'
			})
		} finally {
			setLoading(false, 0);
		}
	}

	const setLoading = (state: boolean, index: number) => {
		const newArray = [...loadingArray];
		newArray[index] = state;
		setLoadingArray(newArray);
	}

	const onHangup = async () => {
		if(session) {
			await session.hangup();
			setSession(undefined);
		}
	}

	const openFeedback = (data: Feedback) => {
		setFeedbackInfo({...data, open: true});
	}

	const handleFeedbackClose = (event?: SyntheticEvent | Event, reason?: string) => {
		if(reason === "clickaway")
			return;

		setFeedbackInfo({...feedbackInfo, open: false});
	}

	return (
		<Box sx={{display: "flex", flexDirection: "column", alignItems: "center"}}>
			<video ref={streamRef} style={{backgroundColor: "gray", width: "800px", height: "480px"}}/>
			<Box sx={{marginTop: "10px"}}>
				<LoadingButton 
					loading={loadingArray[0]} loadingPosition="end" sx={{marginRight: "10px"}}
					variant="contained" onClick={() => onCall()} disabled={!!session}
					endIcon={<Phone/>}>
						Call
				</LoadingButton>
				<LoadingButton
					loading={loadingArray[1]} loadingPosition="end" color="error" 
					variant="contained" onClick={() => onHangup()} disabled={!session}
					endIcon={<CallEnd/>}>
						Hangup
				</LoadingButton>
			</Box>
			<Snackbar open={feedbackInfo.open} autoHideDuration={6000} anchorOrigin={{vertical: "bottom", horizontal: "center"}}
				onClose={handleFeedbackClose} sx={{minWidth: "30%"}}>
				<Alert severity={feedbackInfo.severity} sx={{width: "100%"}} onClose={handleFeedbackClose}>
					<AlertTitle>{feedbackInfo.title}</AlertTitle>
					{feedbackInfo.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default App
