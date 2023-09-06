import type { FormEvent } from 'react';

export const checkId = (id: string | number | undefined): id is string => typeof id === 'string';

export const handleSubmit = (cb: Function) => (e: FormEvent<HTMLFormElement>)=> {
    e.preventDefault();

    cb();
};