interface ServerResponse {
    // Get Devices response
    devices: [Device]
    //Get Sensors response
    infos: [Sensor]
    count: number
    // Login response
    user: User
}