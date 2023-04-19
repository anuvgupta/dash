import TableRecord from "./table/TableRecord";

/**
 * Model for Projects
 */
export default class Project implements TableRecord {
    /**
     * Project constructor
     */
    id: string;
    name: string;
    slug: string;
    repo: string;
    description: string;
    visible: boolean; // referred to as "public" in the database
    docs: string;
    img: string;
    imgInvert: boolean;
    icon: string;
    featured: boolean;
    applications: string[];
    link: string;
    demoPass: string;
    demoPassShow: boolean;
    major: boolean;
    complete: boolean;
    type: string;
    platform: string;
    category: string;
    purpose: string;
    tech: {
        primary: string[];
        secondary: string[];
        languages: string[];
    };
    tagline: string;
    tsCreated: number;
    tsUpdated: number;
    constructor(
        id: string,
        name: string,
        slug: string,
        repo: string,
        desc: string,
        visible: boolean
    ) {
        const timestamp = Date.now();
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.repo = repo;
        this.description = desc;
        this.visible = visible;
        this.docs = "";
        this.img = null;
        this.imgInvert = false;
        this.icon = null;
        this.featured = false;
        this.applications = [];
        this.link = "";
        this.demoPass = "";
        this.demoPassShow = false;
        this.major = false;
        this.complete = false;
        this.type = "none";
        this.platform = "none";
        this.category = "none";
        this.purpose = "none";
        this.tech = {
            primary: [],
            secondary: [],
            languages: [],
        };
        this.tagline = `${desc.split(" ").splice(0, 5).join(" ")}...`;
        this.tsCreated = timestamp;
        this.tsUpdated = timestamp;
    }
}
