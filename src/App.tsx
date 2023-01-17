import { CallEnd, East, North, Phone, South, West } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, AlertColor, AlertTitle, Box, Button, Snackbar, Typography } from '@mui/material'
import { SyntheticEvent, useEffect, useRef, useState } from 'react'
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
	const [url, setUrl] = useState("ws://192.168.2.112:8080/stream/webrtc");
	const [dataChannel, setDataChannel] = useState<RTCDataChannel | undefined>(undefined);

	const [mainCamera, setMainCamera] = useState<boolean>(true);

	const [loadingArray, setLoadingArray] = useState<Array<boolean>>([false, false]);

	const [commandRoutine, setCommandRoutine] = useState<number>(-1);

	const [keys, setKeys] = useState<Array<string>>([]);

	useEffect(() => {
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("keyup", onKeyUp, true);
		
		return(() => {
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("keyup", onKeyUp, true);
			if(commandRoutine !== -1)
				clearInterval(commandRoutine);
		})
	}, []);

	useEffect(() => {
		console.log(keys);
	}, [keys]);

	const onKeyDown = (event: KeyboardEvent) => {
		if(event.repeat)
			return;
		
		let key = event.key;

		if(key.length === 1) {
			key = key.toLowerCase();

			switch(key) {
				case "w":
					key = "ArrowUp";
					break; 
				case "s":
					key = "ArrowDown";
					break; 
				case "d":
					key = "ArrowRight";
					break; 
				case "a":
					key = "ArrowLeft";
					break; 
				default:
					return;
			}
		}

		if(!(key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight"))
			return;
		
		setKeys(keys => {
			if(keys.includes(key))
				return keys;
			
			const newKeys = [...keys];
			newKeys.push(key);
			return newKeys;
		})
	}

	const onKeyUp = (event: KeyboardEvent) => {
		let key = event.key;

		if(key.length === 1) {
			key = key.toLowerCase();

			switch(key) {
				case "w":
					key = "ArrowUp";
					break; 
				case "s":
					key = "ArrowDown";
					break; 
				case "d":
					key = "ArrowRight";
					break; 
				case "a":
					key = "ArrowLeft";
					break; 
				default:
					return;
			}
		}

		if(!(key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight"))
			return;
		
		setKeys(keys => {
			const newKeys = [...keys];
			const keyIndex = keys.indexOf(key);
			
			if(keyIndex < 0)
				return keys;
			
			newKeys.splice(keyIndex, 1);
			return newKeys;
		})
	}

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

	const onDataChannel = (channel: RTCDataChannel) => {
		console.log("Got datachannel");
		setDataChannel(channel);

		setCommandRoutine(setInterval(() => {
			setKeys(pKeys => {
				if(pKeys.length > 0) {
					channel.send(pKeys[0]);
				}

				return pKeys;
			})
		}, 200));
	}

	const onCall = async () => {
		let newSession = new WebrtcSession(url, options);
		newSession.setOnStreamCallback(onStream);
		newSession.setOnDataChannelCallback(onDataChannel);
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
			setDataChannel(undefined);
			clearInterval(commandRoutine);
			setCommandRoutine(-1);
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
			<Box sx={{display: "flex", flexDirection: "column", alignItems: "center"}}>
				<Box sx={{marginTop: "10px", alignSelf: "flex-end", marginBottom: "10px"}}>
					<LoadingButton 
						loading={loadingArray[0]} loadingPosition="end" sx={{marginRight: "10px"}}
						variant="contained" onClick={() => onCall()} disabled={!!session}
						endIcon={<Phone/>}>
							<span>Call</span>
					</LoadingButton>
					<LoadingButton
						loading={loadingArray[1]} loadingPosition="end" color="error" 
						variant="contained" onClick={() => onHangup()} disabled={!session}
						endIcon={<CallEnd/>}>
							<span>Hangup</span>
					</LoadingButton>
				</Box>
				<img src="http://192.168.2.112:8090/stream/video.mjpeg" alt="Video"/>
				<video ref={streamRef} style={{backgroundColor: "gray", width: "800px", height: "480px"}}/>
				<Box sx={{display: "flex", alignSelf: "flex-end", marginTop: "5px", marginRight: "5px"}}>
					<Typography sx={{marginRight: "5px"}}>{"Status:"}</Typography>
					<Typography sx={{color: session ? "green" : "red"}}>{session ? "Connected" : "Disconnected"}</Typography>
				</Box>
				<Box sx={{display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px"}}>
						<North fontSize="large" sx={{color: keys.includes("ArrowUp") ? "black" : "gray"}}/>
						<Box>
							<West fontSize="large" sx={{color: keys.includes("ArrowLeft") ? "black" : "gray"}}/>
							<South fontSize="large" sx={{color: keys.includes("ArrowDown") ? "black" : "gray"}}/>
							<East fontSize="large" sx={{color: keys.includes("ArrowRight") ? "black" : "gray"}}/>
						</Box>
					</Box>
				<Snackbar open={feedbackInfo.open} autoHideDuration={6000} anchorOrigin={{vertical: "bottom", horizontal: "center"}}
					onClose={handleFeedbackClose} sx={{minWidth: "30%"}}>
					<Alert severity={feedbackInfo.severity} sx={{width: "100%"}} onClose={handleFeedbackClose}>
						<AlertTitle>{feedbackInfo.title}</AlertTitle>
						{feedbackInfo.message}
					</Alert>
				</Snackbar>
			</Box>
		</Box>
		
	)
}

export default App