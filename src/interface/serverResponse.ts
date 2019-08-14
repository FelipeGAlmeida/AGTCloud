interface ServerResponse {
    // Get Devices response
    devices: [Device]
    // Get Sensors response
    //infos: [Sensor]
    count: number
    // Get Sensors response in pages
    infos: {
        data: [Sensor],
        count: [Number],
        first: [String],
        last: [String]
    }
    // Login response
    user: User
}