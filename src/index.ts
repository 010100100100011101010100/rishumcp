import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createDrawingCanvas } from "./image.js";
import { SPA } from "./SPA.js";

//I am using spotify-web-api-node to interact with Spotify. If anyone wants to contribute to add more features, check out the library at https://www.npmjs.com/package/spotify-web-api-node#usage
const SpotifyWebAPI = require("spotify-web-api-node");


import google from "googlethis";

const server=new Server({
    name:"mcp",
    version:"0.1.0",},
    {
        capabilities:{
            tools:{},
        }
    }
);


const options={
    page:0,
    safe:true,
    parse_ads:false,
    additional_params:{
        hl:"en",
        gl:"us",
    }
}
async function search(query:string){
    const results=await google.search(query,options);
    return results;
}

server.setRequestHandler(ListToolsRequestSchema,async()=>{
    return {tools:[{
        name:"search",
        description:"Searches Google for the given query",
        inputSchema:{
            type:"object",
            properties:{
                query:{type:"string"}
            },
            required:["query"],
        }
    },
    {
        name:"playmusic",
        description:"Plays requested from spotify",
        inputSchema:{
            type:"object",
            properties:{
                track:{type:"string"},
                band:{type:"string"},
                accessToken:{type:"string"}
            },
            required:["track","band","accessToken"],
        }
    },
    {
        name:"drawImage",
        description:"Generates an image and returns the image on an image canvas with drawing tools",
        inputSchema:{
            type:"object",
            properties:{
                prompt:{type:"string"},
                clientID:{type:"string"}
            },
            required:["prompt","clientID"],
        }
    },

    {
        name:"runCode",
        description:"Runs the generated HTML code in a browser ",
        inputSchema:{
            type:"object",
            properties:{
                code:{type:"string"},
            },
            required:["code"],
        },
    }
]};
});

server.setRequestHandler(CallToolRequestSchema, async(request,extra)=>{
    if(request.params.name=="search"){
        const query=String((request.params.arguments as any)?.query??"").trim();
        const result =await search(query);
        return {
            toolResult:result,
        };
    }
    else if(request.params.name=="playmusic"){
        const spotifyApi=new SpotifyWebAPI();
        const accessToken=String((request.params.arguments as any)?.accessToken??"").trim();
        spotifyApi.setAccessToken(accessToken);
        if(!accessToken){
            console.error("Access token is not there");
        }
        const track=String((request.params.arguments as any)?.track??"").trim();
        const band=String((request.params.arguments as any)?.band??"").trim();
        if(!track || !band){
            console.error("Track or band name is not provided");
            throw new McpError(ErrorCode.MethodNotFound,"Track or band name is not provided");
        }
        
        console.log(`Searching for track: ${track} by ${band}`);
        const searchResult=await spotifyApi.searchTracks(`${track} ${band}`);
        const device=await spotifyApi.getMyDevices();
        if(device.body.devices.length===0){
            throw new McpError(ErrorCode.MethodNotFound,"No active device found to play music");
        }
        const deviceId=device.body.devices[0].id;

        if(searchResult.body.tracks.items>0){
            const trackUri=searchResult.body.tracks.items[0].uri;
            await spotifyApi.play({device_id:deviceId,uris:[trackUri]});
        }
        else{
            throw new McpError(ErrorCode.MethodNotFound,"Track you have mentioned is not found");
        }

    }
    else if(request.params.name=="drawImage"){
        const {clientID,prompt}=request.params.arguments as {
            prompt:string;
            clientID:string;
        }
        try{
            const result=await createDrawingCanvas(clientID,prompt);
            return{
                toolResult:result,
            }

        }
        catch(error){
            throw new McpError(ErrorCode.MethodNotFound,`Error while generating image: ${error}`);
        }
    }

    else if(request.params.name=="runCode"){
        const code=String((request.params.arguments as any)?.code??"").trim();
        if(!code){
            throw new McpError(ErrorCode.MethodNotFound,"Code is not provided");
        }
        try{
            return {
                toolResult:await SPA(code),
            }
        }
        catch(error){
            throw new McpError(ErrorCode.MethodNotFound,`Error while running code: ${error}`);
        }
    }
    else{
        throw new McpError(ErrorCode.MethodNotFound,`Tool ${request.params.name} not found`);
    }
});

const transport=new StdioServerTransport();
await server.connect(transport);
