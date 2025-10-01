import {google} from 'googleapis';

//Simple event (no guests)
export async function simpleEvent(OauthClientID:string,eventName:string,starttime:string,endtime:string,date:string,description:string){
    const calendar=google.calendar({
       version:'v3',
       auth:OauthClientID 
    });
    const event={
        summary:eventName,
        start:{dateTime:`${date}T${starttime}:00`, timeZone:'America/Los_Angeles'},
        end:{dateTime:`${date}T${endtime}:00`, timeZone:'America/Los_Angeles'},
        description:description,
    }
    await calendar.events.insert({
        calendarId:'primary',
        requestBody:event,
    })
}

//recurring event (no guests)
export async function simpleRecurring(OauthClientID:string,eventName:string,starttime:string,endtime:string,date:string,description:string,recurrance:string){
    const calendar=google.calendar({
        version:'v3',
        auth:OauthClientID 
     });
     const event={
            summary:eventName,
            start:{dateTime:`${date}T${starttime}:00`, timeZone:'America/Los_Angeles'},
            end:{dateTime:`${date}T${endtime}:00`, timeZone:'America/Los_Angeles'},
            description:description,
            recurrence:[recurrance],
     }
     await calendar.events.insert({
        calendarId:'primary',
        requestBody:event,
     })
}

//event with guests
export async function guestEvent(OauthClientID:string,eventName:string,starttime:string,endtime:string,date:string,description:string,guestList:string[]){
    const calendar=google.calendar({
        version:'v3',
        auth:OauthClientID 
     });
     const event={
            summary:eventName,
            start:{dateTime:`${date}T${starttime}:00`, timeZone:'America/Los_Angeles'},
            end:{dateTime:`${date}T${endtime}:00`, timeZone:'America/Los_Angeles'},
            description:description,
            attendees: guestList.map(email => ({ email })),
     }
     await calendar.events.insert({
        calendarId:'primary',
        requestBody:event,
     })
     
}

//event with guests and conference options
export async function guestConference(OauthClientID:string,eventName:string,starttime:string,endtime:string,date:string,description:string,guestList:string[], conferenceOptions:boolean){
    const calendar=google.calendar({
        version:'v3',
        auth:OauthClientID 
     });
     const event={
        summary:eventName,
        start:{dateTime:`${date}T${starttime}:00`, timeZone:'America/Los_Angeles'},
        end:{dateTime:`${date}T${endtime}:00`, timeZone:'America/Los_Angeles'},
        description:description,
        attendees: guestList.map(email => ({ email })),
     }
     await calendar.events.insert({
        calendarId:'primary',
        requestBody:event,
        conferenceDataVersion: conferenceOptions ? 1 : 0,
     })
     
}

