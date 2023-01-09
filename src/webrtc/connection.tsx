import { Deferred } from "ts-deferred";
import SignalingChannel from "./signaling";

export type WebrtcOptions = {
    iceServers?: RTCIceServer[],
    useH264: boolean,
    resolution: string
}

class WebrtcSession {
    url: string;
    options: WebrtcOptions;
    pc: RTCPeerConnection | undefined;
    hasRemoteDesc: Deferred<any> = new Deferred();
    signaling: SignalingChannel | undefined;

    onStream: (track: MediaStream) => void;
    onDataChannel: (channel: RTCDataChannel) => void;
    onClose: (e: Event) => void;
    onMessage: (data: any) => void;

    constructor(url: string, options: WebrtcOptions) {
        this.url = url;
        this.options = options;
        this.pc = undefined;
        this.onStream = () => null;
        this.onDataChannel = () => null;
        this.onClose = () => null;
        this.onMessage = () => null;
    }

    setOnStreamCallback(onStream: (track: MediaStream) => void) {
        this.onStream = onStream;
    }

    setOnMessageCallback(onMessage: any) {
        this.onMessage = onMessage;
    }

    setOnCloseCallback(onClose: (e: Event) => void) {
        this.onClose = onClose;
    }

    setOnDataChannelCallback(onDataChannel: (channel: RTCDataChannel) => void) {
        this.onDataChannel = onDataChannel;
    }

    async onSignalingMessage(msg: any) {
        console.log("Message Received")

        var what = msg.what;
        var data = msg.data;
        
        console.dir(msg);

        switch(what) {
            case "offer":
                try {
                    await this.pc?.setRemoteDescription(
                        new RTCSessionDescription(JSON.parse(data))
                    );

                    this.hasRemoteDesc.resolve();

                    var mediaConstraints = {
                        voiceActivityDetection: false,
                        audio: false,
                        video: false
                    };

                    await this.pc?.setLocalDescription(
                        await this.pc.createAnswer(mediaConstraints)
                    )

                    var request = {
                        what: "answer",
                        data: JSON.stringify(this.pc?.localDescription)
                    }

                    console.dir(request);
                    console.log("Sending Message")
                    await this.signaling?.send(request);
                } catch (e) {
                    console.error(e);
                    await this.signaling?.close();
                }

                break;
            case "answer":
                break;
            case "message":
                if(this.onMessage) {
                    this.onMessage(data);
                }

                break;
            case "iceCandidate":
                if(!data || data === "") {
                    console.debug("ICE candidate gathering complete");
                    break;
                }

                let candidate = new RTCIceCandidate(JSON.parse(data));
                await this.hasRemoteDesc.promise;
                await this.pc?.addIceCandidate(candidate);
                
                console.debug(`added remote icecandidate: ${JSON.stringify(candidate)}`);
                break;
            case "iceCandidates":
                console.error("please enable trickle ICE");
                break;
            default:
                break;
        }
    }

    async onSignalingClose(event: Event) {
        console.info("Closing RTCPeerConnection...");
        await this.pc?.close();

        if(this.onClose) {
            this.onClose(event);
        }
    }

    async onSignalingError(event: Event) {
        await this.signaling?.close();
    }

    async call() {
        const config = {iceServers: this.options.iceServers};
        this.pc = config.iceServers ? new RTCPeerConnection(config) : new RTCPeerConnection();

        this.hasRemoteDesc = new Deferred();

        this.pc.onicecandidate = async ({candidate}: RTCPeerConnectionIceEvent) => {
            if(candidate && candidate.candidate.length > 0 ) {
                var request = {
                    what: "addIceCandidate",
                    data: JSON.stringify(candidate)
                };

                console.dir(request);

                console.log("Sending Message")
                await this.signaling?.send(request);
            } else {
                console.debug("End of local ICE candidates");
            }
        }

        if(this.onStream) {
            this.pc.ontrack = async event => {
                await this.onStream(event.streams[0]);
            };
        }

        this.pc.removeTrack = event => {
            console.log("The stream has been removed");
        }

        this.pc.ondatachannel = event => {
            console.info("Data channel available");

            if(this.onDataChannel) {
                this.onDataChannel(event.channel);
            }
        }

        this.signaling = await SignalingChannel.create(this.url);
        
        this.signaling.addMessageListener(
            async msg => await this.onSignalingMessage(msg)
        )

        this.signaling.addCloseListener(
            async event => await this.onSignalingClose(event)
        )

        this.signaling.addErrorListener(
            async event => await this.onSignalingError(event)
        )

        var request = {
            what: "call",
            options: {
                force_hw_vcodec: this.options.useH264,
                vformat: this.options.resolution,
                trickle_ice: true
            }
        };

        console.dir(request);
        console.log("Sending message")
        await this.signaling.send(request);
    }

    async hangup() {
        var request = {
            what: "hangup"
        };

        console.dir(request);

        console.log("Sending message")
        await this.signaling?.send(request);
        await this.signaling?.close();
    }

}

export default WebrtcSession;