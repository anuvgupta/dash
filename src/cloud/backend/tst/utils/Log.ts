import Log from "./backend/utils/Log";

const log = new Log("main");

log.info("some info", "abc");

log.warn("warning 1");
log.warn(new Error("error 2 details"));
log.warn(new Error("error 3 details"), "warning 3");

log.error("error 4");
log.error(new Error("error 5 details"));
log.error(new Error("error 6 details"), "error 6");
