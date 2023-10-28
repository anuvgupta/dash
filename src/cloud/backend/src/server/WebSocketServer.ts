import * as Ws from "ws";
import * as AnsiUp from "ansi_up";
import * as Jwt from "jsonwebtoken";

import Log from "@dash/utils/Log";
import Utilities from "@dash/utils/Utilities";
import JwtConfig from "@dash/config/JwtConfig";

/**
 * Interface to communicatewith socket clients
 */
class SocketClient {
    /**
     * Client constructor
     */
    id: string;
    type: string;
    auth: boolean;
    memory: { [key: string]: any };
    events: { [key: string]: any };
    socket: Ws.WebSocket;
    objectId: string;
    constructor(socket: Ws.WebSocket) {
        this.id = `_c_${Utilities.randomId()}`;
        this.type = "app";
        this.auth = false;
        this.memory = {};
        this.objectId = null;
        this.socket = socket;
        this.events = { disconnect: null };
    }
}

/**
 * Socket request data
 */
type SocketRequest = {
    auth?: string;
    event: string;
    data: any;
};

/**
 * Socket event handler callback
 */
type SocketEventHandler = (
    client: SocketClient,
    req: SocketRequest,
    auth: string
) => void;

/**
 * WebSocket server
 */
@Log.Inject
export default class WebSocketServer {
    /**
     * WebSocketServer constructor
     */
    port: number;
    stage: string;
    online: boolean;
    jwtConfig: JwtConfig;
    clients: { [key: string]: SocketClient }; // client sockets
    events: { [key: string]: SocketEventHandler }; // event handlers
    silencedEvents: string[];
    socket: Ws.WebSocketServer;
    log: Log;
    constructor(stage: string, port: number, jwtConfig: JwtConfig) {
        this.stage = stage;
        this.port = port;
        this.jwtConfig = jwtConfig;
        this.silencedEvents = [];
        this.socket = new Ws.Server({ port });
    }

    /**
     * Initialize websocket server events
     */
    load(): void {
        // Attach server socket events
        this.socket.on("connection", (clientSocket) => {
            // Create client object on new connection
            const client: SocketClient = new SocketClient(clientSocket);
            this.log.info(`Client ${client.id} – connected`);
            // Client socket event handlers
            client.socket.addEventListener("message", (message: any) => {
                const data: SocketRequest = this.decodeMessage(message.data); // parse message
                if (data !== null && data.hasOwnProperty("event")) {
                    if (!data.hasOwnProperty("data") || !data.data) {
                        data.data = null;
                    }
                    if (!data.hasOwnProperty("auth") || !data.auth) {
                        data.auth = null;
                    }
                    // console.log('    ', data.event, data.data);
                    if (!this.silencedEvents.includes(data.event)) {
                        this.log.info(
                            `Client ${client.id} – message: ${data.event}`,
                            data.data
                        );
                    }
                    // Handle various events
                    if (this.events.hasOwnProperty(data.event)) {
                        this.events[data.event](client, data.data, data.auth);
                    } else {
                        this.log.error(`Unknown event ${data.event}`);
                    }
                } else {
                    this.log.error(
                        `Client ${client.id} – invalid message: `,
                        message.data
                    );
                }
            });
            client.socket.addEventListener("error", (e: any) => {
                this.log.error(`Client ${client.id} – error`, e);
            });
            client.socket.addEventListener("close", () => {
                this.log.info(`Client ${client.id} – disconnected`);
                const disconnectEvent: (callback: () => void) => void =
                    client.events.disconnect;
                if (disconnectEvent != null) {
                    disconnectEvent(() => {
                        // Remove client object on disconnect
                        this.deleteClient(client.id);
                    });
                } else {
                    this.deleteClient(client.id);
                }
            });
            // Add client object to client object list
            this.clients[client.id] = client;
        });
        this.socket.on("listening", () => {
            this.log.info(`Listening on ${this.port}`);
            this.online = true;
        });
        this.socket.on("error", (e: any) => {
            this.log.error(e, "Server error");
            this.online = false;
        });
        this.socket.on("close", () => {
            this.log.info("Server closed");
            this.online = false;
        });
    }

    /**
     * Bind handler to client event
     */
    bind(
        event: string,
        handler: SocketEventHandler,
        authRequired?: boolean
    ): void {
        authRequired = authRequired ?? true;
        this.events[event] = (
            client: SocketClient,
            req: SocketRequest,
            auth: string
        ) => {
            if (
                !authRequired ||
                (client.auth &&
                    (this.verifyToken(auth) || client.type === "daemon"))
            ) {
                handler(client, req, auth);
            }
        };
    }

    /**
     * Close server
     */
    private close(next?: () => void) {
        this.socket.close(() => {
            if (next) next();
        });
    }

    /**
     * Encode event+data to JSON
     */
    private encodeMessage(event: string, data: any): string {
        return JSON.stringify({
            event,
            data,
        });
    }

    /**
     * Decode event+data from JSON
     */
    private decodeMessage(message: string): SocketRequest {
        let messageData: any = null;
        try {
            messageData = JSON.parse(message);
        } catch (e: any) {
            this.log.error(e, "Invalid json msg");
            messageData = null;
        }
        return messageData as SocketRequest;
    }

    /**
     * Verify JSON web token
     */
    private verifyToken(token: string): boolean {
        if (!token || token === null) return false;
        let result: any = null;
        try {
            result = Jwt.verify(token, this.jwtConfig.secret);
        } catch (e: any) {
            result = null;
            this.log.error(
                e,
                `Error verifying token "${token}": ${
                    e.message ? e.message : ""
                }`
            );
        }
        return result === null ? false : true;
    }

    /**
     * Mark client as authenticated
     */
    private authenticateClient(client: SocketClient, auth?: boolean): string {
        client.auth = auth ?? true;
        // jwt.sign({ user_id: `${String(client.o_id)}` }, `${String(client.o_id)}`);
        return Jwt.sign(
            { clientId: `${client.id}`.trim() },
            this.jwtConfig.secret,
            {
                // algorithm: this.jwtConfig.algorithm,
                expiresIn: this.jwtConfig.expiration,
            }
        );
    }

    /**
     * Assign client to specific type/group
     */
    private groupClient(client: SocketClient, type?: string): void {
        type = type ?? "app";
        client.type = type;
    }

    /**
     * Get client object ID
     */
    private getClientObjectId(client: SocketClient): string {
        return client.objectId;
    }

    /**
     * Set client object ID
     */
    private setClientObjectId(client: SocketClient, objectId: string): void {
        client.objectId = objectId;
    }

    /**
     * Send data to specific client
     */
    private sendToClient(
        event: string,
        data: any,
        client: SocketClient,
        authRequired?: boolean
    ): void {
        authRequired = authRequired ?? true;
        if (!authRequired || client.auth) {
            client.socket.send(this.encodeMessage(event, data));
        }
    }

    /**
     * Delete client object
     */
    private deleteClient(clientId: string) {
        delete this.clients[clientId];
    }

    /**
     * Send data to all clients in group
     */
    private sendToGroup(
        event: string,
        data: any,
        group: string,
        authRequired?: boolean
    ): void {
        authRequired = authRequired ?? true;
        for (const clientId in this.clients) {
            if (
                this.clients.hasOwnProperty(clientId) &&
                this.clients[clientId] !== null &&
                (!authRequired || this.clients[clientId].auth) &&
                this.clients[clientId].type === group
            ) {
                this.clients[clientId].socket.send(
                    this.encodeMessage(event, data)
                );
            }
        }
    }

    /**
     * Trigger event for specific client
     */
    private triggerForClient(
        event: string,
        data: any,
        client: SocketClient,
        authRequired?: boolean
    ): void {
        authRequired = authRequired ?? true;
        if (!authRequired || client.auth) {
            this.events[event](client, data, "TRIGGER");
        }
    }

    /**
     * Return error for event
     */
    private returnEventError(
        event: string,
        errorMessage: string,
        client: SocketClient,
        authRequired?: boolean
    ): boolean {
        authRequired = authRequired ?? true;
        this.sendToClient(
            `${event}_res`,
            {
                success: false,
                message: `${errorMessage}`,
            },
            client,
            authRequired
        );
        return false;
    }

    /**
     * Return data for event
     */
    private returnEventData(
        event: string,
        data: any,
        client: SocketClient,
        authRequired?: boolean
    ): boolean {
        this.sendToClient(
            `${event}_res`,
            {
                success: true,
                data,
            },
            client,
            authRequired
        );
        return true;
    }
}
