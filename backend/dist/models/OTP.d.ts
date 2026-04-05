import mongoose from 'mongoose';
export declare const OTP: mongoose.Model<{
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
}, {}, mongoose.DefaultSchemaOptions> & {
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
}>, {}, mongoose.DefaultSchemaOptions> & mongoose.FlatRecord<{
    email: string;
    createdAt: NativeDate;
    otp: string;
    purpose: "login" | "register";
    attempts: number;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=OTP.d.ts.map