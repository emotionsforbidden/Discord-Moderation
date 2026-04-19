import { singleton } from 'tsyringe';

@singleton()
export class DateService {
    public nowTimestamp() {
        return Date.now();
    }

    public nowDate() {
        return new Date();
    }
}
