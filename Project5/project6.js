var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

const float T_MIN = 0.01; // delta to avoid weird light intersections

bool IntersectRay( inout HitInfo hit, Ray ray );


vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);

	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		vec3 light_dir_unnormalized = lights[i].position - position;
		float light_dist = length(light_dir_unnormalized); // Distance to the light source
		vec3 L = normalize(light_dir_unnormalized);       // Normalized light direction

		Ray shadow_ray;
		const float T_shadow = 0.01;
		shadow_ray.pos = position + normal* T_shadow; // Offset to avoid self-intersection
		shadow_ray.dir = L;

		HitInfo shadow_hit;
		bool occluder_found = IntersectRay(shadow_hit, shadow_ray);
		
		bool in_shadow = false;
		if (occluder_found) {
			in_shadow = true;
		}

		if (!in_shadow) { 
			// Diffuse term
			float cos_theta = max(0.0, dot(normal, L));
			color += mtl.k_d * lights[i].intensity * cos_theta;

			// Specular term
			if (cos_theta > 0.0) {
				vec3 H = normalize(L + view); // Halfway vector
				float cos_phi = max(0.0, dot(normal, H));
				if (cos_phi > 0.0) {
					color += mtl.k_s * lights[i].intensity * pow(cos_phi, mtl.n);
				}
			}
		}
	}
	
	return color;
}

bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30; 
	bool foundHit = false;
	float closest_t = hit.t;
	vec3 D = normalize(ray.dir); 

	for ( int i=0; i<NUM_SPHERES; ++i ) {

		// first we calculate the hits on spheres
		vec3 L = ray.pos - spheres[i].center; 
		float a = dot(D, D); // Should be 1 if D is normalized
		float b = 2.0 * dot(L, D);
		float c = dot(L, L) - spheres[i].radius * spheres[i].radius;
		float discriminant = b * b - 4.0 * a * c;

		// No intersection
		if (discriminant < 0.0) {
			continue;
		}

		float sqrt_disc = sqrt(discriminant);
		float t0 = (-b - sqrt_disc) / (2.0 * a);
		float t1 = (-b + sqrt_disc) / (2.0 * a);

		if (t0 > T_MIN) {
			closest_t = min(closest_t, t0);
		}
		if (t1 > T_MIN) {
			closest_t = min(closest_t, t1);
		}

		//update the hit information if we found a closer intersection
		if (closest_t < hit.t) {
			hit.t = closest_t;
			hit.position = ray.pos + hit.t * D; 
			hit.normal = normalize(hit.position - spheres[i].center); // Normal of the sphere that will be used for shading
			hit.mtl = spheres[i].mtl; // also the material of the sphere
			foundHit = true; 
		}
	}
	return foundHit;
}


vec4 RayTracer( Ray ray )
{
	HitInfo hit;	
	ray.dir = normalize(ray.dir); 

	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir ); // View vector points back towards ray origin
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		vec3 k_s = hit.mtl.k_s; 

		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;

			Ray r;	
			HitInfo h;	
			r.pos = hit.position + hit.normal * T_MIN;
			r.dir = reflect( -view, hit.normal ); // Reflect the incoming ray direction (-view)

			if ( IntersectRay( h, r ) ) {
				vec3 reflected_view = normalize( -r.dir );
				clr += k_s * Shade( h.mtl, h.position, h.normal, reflected_view );
				hit = h; 
				view = reflected_view; 
				k_s *= hit.mtl.k_s; 
			} else {
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	
			}
		}
		return vec4( clr, 1 );	
	} else {
		return vec4(textureCube(envMap, ray.dir.xzy).rgb, 0.0);
	}
}
`;