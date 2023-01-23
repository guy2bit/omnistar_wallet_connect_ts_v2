export function debounce<T extends Function>(callback: T, wait: number = 1000) {
    let timer: NodeJS.Timeout | null;
    let callable = (...args: any) => {
        if(timer) clearTimeout(timer);
        timer = setTimeout(()=>callback(...args), wait);
    }
    return (callable as any) as T;
}

export class ResolveLastAsync {
    static timeoutId: NodeJS.Timeout | undefined;
    static value: any;
    static set<T extends Function>(callback: T){
        ResolveLastAsync.timeoutId = undefined;

        if (typeof ResolveLastAsync.timeoutId === 'number') clearTimeout(ResolveLastAsync.timeoutId);
        
        ResolveLastAsync.timeoutId = setTimeout(() => {
            ResolveLastAsync.value = callback();
            ResolveLastAsync.timeoutId = undefined;
        }, 0);
        return ResolveLastAsync.value;    
    }
}
