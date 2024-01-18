/* eslint-disable react-hooks/exhaustive-deps */
import { createRef, useEffect, useMemo, useState } from "react";
import { DebouncedFunc, debounce, throttle } from "lodash";
import { useSearchParams } from "react-router-dom";

import AdvancedQueryResponse from "./AdvancedQueryResponse.type";
import { Popover, PopoverContent, PopoverDescription, PopoverTrigger } from "../Popover/Popover";

import SearchIcon from "../Search.svg";

import Styles from "./WikiSearchAdvanced.module.scss";

const itemLimit = 50;

export default function WikiSearchAdvanced() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchKey, setSearchKey] = useState(searchParams.get("q") ?? '');
    const [recentSearches, setRecentSearches] = useState<string[] | undefined>();
    const [results, setResults] = useState<AdvancedQueryResponse>();
    const [loading, setLoading] = useState(false);
    const scrollViewer = createRef<HTMLDivElement>();
    const observeTarget = createRef<HTMLDivElement>();

    const handleSearchKeyChange = useMemo<DebouncedFunc<(searchKey: string, recentSearchKeys: typeof recentSearches, page?: number, complete?: boolean) => void>>(() => debounce(throttle((searchKey: string, recentSearchKeys: typeof recentSearches, page: number = 0) => {
        if (!searchKey || searchKey?.length === 0 || (recentSearchKeys?.[0] === searchKey.trim() && results?.query)) {
            return;
        }
        if (page === 0)
            setLoading(true);

        fetch(`https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&utf8=&format=json&sroffset=${page * itemLimit}&srlimit=${itemLimit}&srsearch=${searchKey}`).then<AdvancedQueryResponse>(resp => resp.json()).then(results => {
            setRecentSearches(recentSearches => {
                const newSearchCache = [searchKey.trim(), ...(recentSearches ?? []).filter(i => i.trim().toLowerCase() !== searchKey.toLowerCase().trim())];
                if (newSearchCache.length > 10) newSearchCache.length = 10;
                return newSearchCache;
            });
            const newParam = new URLSearchParams();
            newParam.set('q', searchKey);
            setSearchParams(newParam);


            setResults((old) => {
                if (page > 0 && old) {
                    const newResult = old;
                    newResult.query.search = [...old.query.search, ...results.query.search];
                    return newResult;
                }
                return results;
            });
        }).finally(() => {
            setLoading(false);
        });
    }, 1200), 600), []);

    useEffect(() => {
        setResults(undefined)
        if (searchKey) {
            setLoading(true);
            handleSearchKeyChange(searchKey, recentSearches);
        }
    }, [handleSearchKeyChange, searchKey]);

    useEffect(() => {
        const observer = new IntersectionObserver(([observerEntry]) => {
            if (observerEntry.intersectionRatio <= 0) return;

            console.log(Number(observerEntry.target.getAttribute('data-fetch')));

            handleSearchKeyChange(searchKey, recentSearches, Number(observerEntry.target.getAttribute('data-fetch')));
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
    const noResults = !loading && searchKey && results && Array.isArray(results.query.search) && results.query.search.length === 0;

    /**
     * TODO: Make Scroll Paginated
     */
    return <>
        <main>
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

                                if (!e.currentTarget.value) setResults(undefined);
                            }}
                            placeholder="Seach Wiki Content"
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
                        (loading || noResults) && <div data-no-results={noResults} className={`${Styles.QwikiSearchResult} ${Styles.Placeholder}`}>
                            {noResults ? <h4> No Results Found</h4> : <>
                                <h4 className={Styles.Gradient}>Title</h4>
                                <p className={Styles.Gradient} dangerouslySetInnerHTML={{
                                    __html: "The United States of America (USA), commonly known as the United States (U.S.) or America, is a country primarily located in North America. The third-largest"
                                }}></p>
                                <a className={Styles.Gradient} target="wiki-article-id" href="article-link">Read More...</a>
                            </>
                            }
                        </div>
                    }
                    {
                        !loading && results?.query.search.map((_, index) => <div key={results.query.search[index].pageid} className={Styles.QwikiSearchResult}>
                            <a target={`wiki-${results.query.search[index].pageid}`} href={`http://en.wikipedia.org/?curid=${results.query.search[index].pageid}`}><h4>{results.query.search[index].title} ↗</h4></a>
                            <p dangerouslySetInnerHTML={{
                                __html: results.query.search[index].snippet
                            }}></p>
                            {results && results.query.search.length < results.query.searchinfo.totalhits && index === (results?.query.search.length - Math.floor(itemLimit * 0.5)) && <div ref={observeTarget} data-fetch={Math.floor((results?.query.search.length ?? 0) / itemLimit)} />}
                        </div>)
                    }
                    {
                        !loading && results && results.query.search.length < results.query.searchinfo.totalhits && <div className={`${Styles.QwikiSearchResult} ${Styles.Placeholder}`}>
                            <h4 className={Styles.Gradient}>Title</h4>
                            <p className={Styles.Gradient} dangerouslySetInnerHTML={{
                                __html: "The United States of America (USA), commonly known as the United States (U.S.) or America, is a country primarily located in North America. The third-largest"
                            }}></p>
                            <a className={Styles.Gradient} target="wiki-article-id" href="article-link">Read More...</a>
                        </div>
                    }
                    {!noResults && results && results.query.search.length === results.query.searchinfo.totalhits && "No More Results To Display"}
                </div>
            </div>
        </main >
    </>
}