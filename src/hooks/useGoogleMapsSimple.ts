import { useEffect, useState, useRef } from 'react';

interface UseGoogleMapsSimpleOptions {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
  options?: google.maps.MapOptions;
}

interface UseGoogleMapsSimpleReturn {
  map: google.maps.Map | null;
  isLoaded: boolean;
  isError: boolean;
  error: string | null;
}

// Global singleton for Google Maps API loading
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private isLoading: boolean = false;
  private isLoaded: boolean = false;
  private callbacks: Array<() => void> = [];
  private errorCallbacks: Array<(error: string) => void> = [];

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(): Promise<void> {
    // If already loaded, resolve immediately
    if (this.isLoaded && window.google && window.google.maps) {
      return Promise.resolve();
    }

    // If currently loading, wait for it
    if (this.isLoading) {
      return new Promise<void>((resolve, reject) => {
        this.callbacks.push(resolve);
        this.errorCallbacks.push(reject);
      });
    }

    // Start loading
    this.isLoading = true;

    return new Promise<void>((resolve, reject) => {
      this.callbacks.push(resolve);
      this.errorCallbacks.push(reject);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        this.handleError('Google Maps API key not found');
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="googleapis.com"]');
      if (existingScript) {
        // Wait for existing script to load
        this.waitForGoogleMaps();
        return;
      }

      // Create global callback
      const callbackName = 'initGoogleMapsGlobal';
      (window as unknown as Record<string, () => void>)[callbackName] = () => {
        this.handleSuccess();
        delete (window as unknown as Record<string, () => void>)[callbackName];
      };

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&loading=async&libraries=maps&v=weekly`;
      script.async = true;
      script.defer = true;

      // Handle errors
      script.onerror = () => {
        this.handleError('Failed to load Google Maps API');
        delete (window as unknown as Record<string, () => void>)[callbackName];
      };

      // Add to page
      document.head.appendChild(script);

      // Timeout fallback
      setTimeout(() => {
        if (!this.isLoaded) {
          this.handleError('Google Maps API loading timeout');
        }
      }, 10000);
    });
  }

  private waitForGoogleMaps(): void {
    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkInterval);
        this.handleSuccess();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isLoaded) {
        this.handleError('Google Maps API loading timeout');
      }
    }, 10000);
  }

  private handleSuccess(): void {
    this.isLoaded = true;
    this.isLoading = false;

    // Resolve all pending callbacks
    this.callbacks.forEach(callback => callback());
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  private handleError(error: string): void {
    this.isLoading = false;

    // Reject all pending callbacks
    this.errorCallbacks.forEach(callback => callback(error));
    this.callbacks = [];
    this.errorCallbacks = [];
  }
}

export function useGoogleMapsSimple({
  containerRef,
  center = { lat: 10.8231, lng: 106.6297 },
  zoom = 12,
  options = {}
}: UseGoogleMapsSimpleOptions): UseGoogleMapsSimpleReturn {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization or re-initialization when map is already loaded
    if (initializationRef.current || isLoaded) {
      return;
    }

    initializationRef.current = true;

    // Use a timeout to ensure React has attached the ref
    const timeout = setTimeout(() => {
      if (!containerRef?.current) {
        setError('Map container element not found');
        setIsError(true);
        initializationRef.current = false; // Allow retry
        return;
      }

      const initializeMap = async () => {
        try {
          // Double-check container is still available
          if (!containerRef.current || !containerRef.current.isConnected) {
            throw new Error('Container not available or not connected to DOM');
          }

          // Check if Google Maps is already loaded
          if (window.google && window.google.maps) {
            const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

            // Create map instance
            const mapInstance = new Map(containerRef.current, {
              center,
              zoom,
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              zoomControl: true,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              ...options
            });

            setMap(mapInstance);
            setIsLoaded(true);
            setIsError(false);
            setError(null);

            return;
          }

          // Use the singleton loader to load Google Maps script
          const loader = GoogleMapsLoader.getInstance();

          loader.load()
            .then(async () => {
              const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

              // Create map instance
              const mapInstance = new Map(containerRef.current!, {
                center,
                zoom,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
                zoomControl: true,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                ...options
              });

              setMap(mapInstance);
              setIsLoaded(true);
              setIsError(false);
              setError(null);

            })
            .catch((err) => {
              console.error('Failed to load Google Maps API:', err);
              setIsError(true);
              setError(err);
              setIsLoaded(false);
              initializationRef.current = false; // Allow retry
            });

        } catch (err) {
          console.error('Failed to initialize Google Maps:', err);
          setIsError(true);
          setError(err instanceof Error ? err.message : 'Failed to initialize map');
          setIsLoaded(false);
          initializationRef.current = false; // Allow retry
        }
      };

      initializeMap();
    }, 100); // Wait 100ms for ref to attach (same as test-maps-direct)

    return () => {
      clearTimeout(timeout);
      initializationRef.current = false; // Reset so it can retry on next mount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]); // Intentional: Map initializes once with initial center/zoom/options

  return {
    map,
    isLoaded,
    isError,
    error
  };
}