import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';


import AwesomeDebouncePromise from "awesome-debounce-promise";
import { useState } from "react";
import { useAsync } from "react-async-hook";
import useConstant from "use-constant";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useDebouncedSearch = (searchFunction: any, wait: number = 1000) => {
    // Handle the input state
    const [inputText, setInputText] = useState('');

    // Debounce the original search async function
    const debouncedSearchFunction = useConstant(()=>
        AwesomeDebouncePromise(searchFunction, wait)
    );

    // The async callback is run each change
    // but as the search function si debounced, 
    // it does not fire a new request on each change
    const searchResult = useAsync(async ()=>{
        if(inputText.length === 0) return [];
        return debouncedSearchFunction(inputText);
    }, [debouncedSearchFunction, inputText]);

    // Return everything needed for the hook consumer
    return { inputText, setInputText, searchResult };
}


