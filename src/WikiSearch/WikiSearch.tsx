/* eslint-disable react-hooks/exhaustive-deps */
import { createRef, useEffect, useMemo, useState } from "react";
import { DebouncedFunc, debounce, throttle } from "lodash";
import Styles from "./WikiSearch.module.scss";

import SearchIcon from "../Search.svg";

import { Popover, PopoverContent, PopoverDescription, PopoverTrigger } from "../Popover/Popover";
import { useSearchParams } from "react-router-dom";
import OpenSearchQueryResponse from "./OpenSearchQueryResponse.type";

const itemLimit = 100;

export default function WikiSearch() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchKey, setSearchKey] = useState(searchParams.get("q") ?? '');
    const [recentSearches, setRecentSearches] = useState<string[] | undefined>();
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [pageCache, setPageCache] = useState<number[]>([]);
    const [searchResults, setSearchResults] = useState<OpenSearchQueryResponse>();
    const [loading, setLoading] = useState(false);
    const scrollViewer = createRef<HTMLDivElement>();
    const observeTarget = createRef<HTMLDivElement>();
    const [endOfResults, setEndOfResults] = useState(false);

    const handleSearchKeyChange = useMemo<DebouncedFunc<(searchKey: string, recentSearchKeys: typeof recentSearches, pageCaches: typeof pageCache, currentPage: number, page?: number,) => void>>(() => debounce(throttle((searchKey: string, recentSearchKeys: typeof recentSearches, pageCache, currentPage, page: number = 0) => {
        if (!searchKey || searchKey?.length === 0 || (recentSearchKeys?.[0] === searchKey.trim() && searchResults?.[1])) {
            return;
        }

        setLoading(true);

        if (page !== currentPage)
            setCurrentPage(page);

        setPageCache(pageCache => [...(pageCache ?? []), page]);

        fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=opensearch&format=json&profile=fuzzy&formatVersion=2&namespace=0&limit=${(page + 1) * itemLimit}&search=${searchKey}`).then<OpenSearchQueryResponse>(resp => resp.json()).then(results => {
            setRecentSearches(recentSearches => {
                const newSearchCache = [searchKey.trim(), ...(recentSearches ?? []).filter(i => i.trim().toLowerCase() !== searchKey.toLowerCase().trim())];
                if (newSearchCache.length > 10) newSearchCache.length = 10;
                return newSearchCache;
            });

            setSearchResults((old) => {
                if (page > 0 && old && old[1].length !== results[1].length) {
                    const newResult: typeof old = [...old];
                    newResult[1] = [...old[1], ...results[1].slice((page) * itemLimit)];
                    newResult[2] = [...old[2], ...results[2].slice((page) * itemLimit)];
                    newResult[3] = [...old[3], ...results[3].slice((page) * itemLimit)];

                    return newResult;
                }
                return results;
            });

            const newParam = new URLSearchParams();
            newParam.set('q', searchKey);
            setSearchParams(newParam);

            if (results[1].length < ((page + 1) * itemLimit))
                setEndOfResults(true);
        }).finally(() => {
            setLoading(false);
        });
    }, 1200), 600), []);

    useEffect(() => {
        setEndOfResults(false);
        setSearchResults(undefined);
        setCurrentPage(0);
        setPageCache([]);
        if (searchKey) {
            setLoading(true);
            handleSearchKeyChange(searchKey, recentSearches, pageCache, currentPage);
        }
    }, [handleSearchKeyChange, searchKey]);

    useEffect(() => {
        const observer = new IntersectionObserver(([observerEntry]) => {
            if (observerEntry.intersectionRatio <= 0) return;

            console.log(Number(observerEntry.target.getAttribute('data-fetch')));

            handleSearchKeyChange(searchKey, recentSearches, pageCache, currentPage, Number(observerEntry.target.getAttribute('data-fetch')));
        }, {
            root: scrollViewer.current,
            threshold: 1
        });

        if (scrollViewer.current && observeTarget.current) {
            observer.observe(observeTarget.current);
        }

        return () => {
            observer.disconnect();
        }
    }, [scrollViewer]);

    const items = (recentSearches ?? []).map((recentSearch) => (!searchKey || new RegExp(`(${recentSearch})`, 'gi')
        .test(searchKey)) && <div key={recentSearch} onClick={() => {
            const newParam = new URLSearchParams();
            newParam.set('q', recentSearch);
            setSearchParams(newParam);
            setSearchKey(recentSearch);
        }} className="popover-content">{recentSearch}</div>).filter(Boolean);

    const noResults = !loading && searchKey && searchResults && Array.isArray(searchResults[1]) && searchResults[1].length === 0;

    /**
     * TODO: Make Scroll Paginated
     */
    return <main>
        <div id={Styles.QwikiSearchContainer}>
            <Popover placement="bottom-start">
                <PopoverTrigger>
                    <textarea
                        id={Styles.QwikiSearch}
                        name="qwiki-search"
                        role="search"
                        autoFocus
                        onChange={(e) => {
                            const newParam = new URLSearchParams();
                            newParam.set('q', e.currentTarget.value.replace(/\n/g, ''));
                            setSearchParams(newParam);
                            setSearchKey(e.currentTarget.value.replace(/\n/g, ''));

                            if (!e.currentTarget.value) setSearchResults(undefined);
                        }}
                        placeholder="Seach Wiki Titles"
                        value={searchKey}
                        rows={1}
                    />
                </PopoverTrigger>
                {!searchKey && Array.isArray(items) && items.length > 0 && <PopoverContent className="Popover">
                    <PopoverDescription>
                        <div className={Styles.Title}>
                            <h6>Recent Searches</h6> <a href="/#" onClick={() => setRecentSearches([])}><h6>Clear</h6></a>
                        </div>
                        {items}
                    </PopoverDescription>
                </PopoverContent>}
            </Popover>
            <img src={SearchIcon} alt="Search Icon" />
        </div>
        <div className={Styles.History}>
            {(recentSearches?.length ?? 0) > 0 && <>
                Search History: {recentSearches?.map(item => <div onClick={() => {
                    const newParam = new URLSearchParams();
                    newParam.set('q', item);
                    setSearchParams(newParam);
                    setSearchKey(item);
                }}>{item}</div>)}
            </>}
        </div>
        <div id={Styles.QwikiSearchResultContainer} ref={scrollViewer}>
            <div className={Styles.QwikiSearchResults}>
                {
                    searchResults?.[1].map((_, index) => <a key={searchResults[3][index]} target={`wiki-${searchResults[3][index]}`} href={searchResults[3][index]} className={Styles.QwikiSearchResult}>
                        <h4>{searchResults[1][index]} ↗</h4>
                        {!endOfResults && index === searchResults[1].length - 20 && <div ref={observeTarget} data-fetch={currentPage + 1} />}
                    </a>)
                }
                {
                    (loading || (searchKey && !endOfResults)) && <div className={`${Styles.QwikiSearchResult} ${Styles.Placeholder}`}>
                        <h4 className={Styles.Gradient}>Title</h4>
                    </div>
                }
                {noResults && <div>
                    {!loading && endOfResults && <div className={`${Styles.QwikiSearchResult}`}>
                        <h4 className={Styles.Gradient}>No Results Found</h4>
                    </div>}
                </div>}
            </div>
        </div>
    </main >
}